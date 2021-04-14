import { connectDatabase } from "./mongo";
import Account from "./AccountModel";
import Transaction from "./TransactionModel";
import mongoose, { Types } from "mongoose";

const { ObjectId } = mongoose.Types;

const cancel = async (id: string) => {
  await Transaction.updateOne(
    {
      _id: id,
    },
    {
      $set: {
        state: "canceled",
      },
    }
  );
};

const rollback = async (
  from: string,
  to: string,
  amount: number,
  id: string
) => {
  // Reverse debit
  await Account.updateOne(
    {
      name: from,
      pendingTransactions: { $in: [id] },
    },
    {
      $inc: { balance: amount },
      $pull: { pendingTransactions: id },
    }
  );

  // Reverse credit
  await Account.updateOne(
    {
      name: to,
      pendingTransactions: { $in: [id] },
    },
    {
      $inc: { balance: -amount },
      $pull: { pendingTransactions: id },
    }
  );

  await cancel(id);
};

const cleanup = async (from: string, to: string, id: string) => {
  // Remove the transaction ids
  await Account.updateOne(
    { name: from },
    { $pull: { pendingTransactions: id } }
  );

  // Remove the transaction ids
  await Account.updateOne({ name: to }, { $pull: { pendingTransactions: id } });

  // Update transaction to committed
  await Transaction.updateOne({ _id: id }, { $set: { state: "done" } });

  const fromAccount = await Account.findOne({
    name: from,
  });
  const toAccount = await Account.findOne({
    name: to,
  })

  const done = await Transaction.findOne({
    _id: id,
  });

  console.log('cleanup: ', {
    fromAccount,
    toAccount,
    done,
  });
};

const executeTransaction = async (from: string, to: string, amount: number) => {
  const transactionId = ObjectId();

  const transaction = await new Transaction({
    _id: transactionId,
    source: from,
    destination: to,
    amount: amount,
    state: "initial",
  }).save();
  console.log('initial transaction: ', {
    transaction,
  })

  let result = await Transaction.updateOne(
    { _id: transactionId },
    { $set: { state: "pending" } }
  );

  const pending = await Transaction.findOne({
    _id: transactionId,
  });

  console.log('pending transaction: ', {
    pending,
  });

  if (result.modifiedCount == 0) {
    await cancel(transactionId);
    throw Error("Failed to move transaction " + transactionId + " to pending");
  }

  // Set up pending debit
  result = await Account.updateOne(
    {
      name: from,
      pendingTransactions: { $ne: transactionId },
      balance: { $gte: amount },
    },
    {
      $inc: { balance: -amount },
      $push: { pendingTransactions: transactionId },
    }
  );

  if (result.modifiedCount == 0) {
    await rollback(from, to, amount, transactionId);
    throw Error("Failed to debit " + from + " account");
  }

  const debitAccount = await Account.findOne({
    name: from,
  });

  console.log('debit: ', {
    debitAccount,
  });

  // Setup pending credit
  result = await Account.updateOne(
    {
      name: to,
      pendingTransactions: { $ne: transactionId },
    },
    {
      $inc: { balance: amount },
      $push: { pendingTransactions: transactionId },
    }
  );

  if (result.modifiedCount == 0) {
    await rollback(from, to, amount, transactionId);
    throw Error("Failed to credit " + to + " account");
  }

  const creditAccount = await Account.findOne({
    name: to
  });

  console.log('credit: ', {
    creditAccount,
  });

  // Update transaction to committed
  result = await Transaction.updateOne(
    { _id: transactionId },
    { $set: { state: "committed" } }
  );

  if (result.modifiedCount == 0) {
    await rollback(from, to, amount, transactionId);
    throw Error(
      "Failed to move transaction " + transactionId + " to committed"
    );
  }

  const commited = await Transaction.findOne({
    _id: transactionId,
  });

  console.log('commited transaction: ', {
    commited,
  });

  // Attempt cleanup
  await cleanup(from, to, transactionId);
};

const run = async () => {
  // create 2 accounts
  let joeAccount;
  let peterAccount;

  joeAccount = await Account.findOne({
    name: "Joe Moneylender",
  });

  if (!joeAccount) {
    joeAccount = await new Account({
      name: "Joe Moneylender",
      balance: 1000,
      pendingTransactions: [],
    }).save();
  }

  peterAccount = await Account.findOne({
    name: "Peter Bum",
  });

  if (!peterAccount) {
    peterAccount = await new Account({
      name: "Peter Bum",
      balance: 1000,
      pendingTransactions: [],
    }).save();
  }

  await executeTransaction(joeAccount.name, peterAccount.name, 100);
};

(async () => {
  try {
    await connectDatabase();

    await run();
  } catch (err) {
    console.log(err);
  }

  process.exit(0);
})();
