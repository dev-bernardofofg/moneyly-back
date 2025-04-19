import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'O nome é obrigatório'],
    },
    email: {
      type: String,
      required: [true, 'O email é obrigatório'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'A senha é obrigatória'],
      minlength: 6,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('users', UserSchema);
