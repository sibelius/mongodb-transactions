import mongoose, { Document, Model } from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  state: {
    type: String,
  },
  source: {
    // prefer account id
    type: String,
  },
  destination: {
    // prefer account id
    type: String,
  },
  amount: {
    type: Number,
  },
}, {
  collection: 'Transaction',
  timestamps: true,
});

export interface ITransaction extends Document {
  createdAt: Date;
  updatedAt: Date;
}

const TransactionModel: Model<ITransaction> = mongoose.model('Transaction', TransactionSchema);

export default TransactionModel;
