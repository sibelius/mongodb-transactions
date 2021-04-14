import mongoose, { Document, Model, Types } from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const AccountSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  balance: {
    type: Number,
  },
  pendingTransactions: {
    type: [ObjectId],
    default: [],
  },
}, {
  collection: 'Account',
  timestamps: true,
});

export interface IAccount extends Document {
  createdAt: Date;
  updatedAt: Date;
}

const AccountModel: Model<IAccount> = mongoose.model('Account', AccountSchema);

export default AccountModel;
