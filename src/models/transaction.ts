import { Document, model, Schema, Types } from "mongoose";

export interface ITransaction extends Document {
    userId: Types.ObjectId;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description?: string;
    date: Date;
    createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
    },
    category: {
        type: String,
        required: true
    },
    description: String,
    date: {
        type: Date,
        default: Date.now,
    },
},
    { timestamps: true }
)

export default model<ITransaction>('Transaction', TransactionSchema);
