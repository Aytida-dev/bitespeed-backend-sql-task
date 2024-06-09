export interface Customer {
  id?: number;
  phoneNumber?: string;
  email?: string;
  linkedId?: string;
  linkPrecedence: "SECONDARY" | "PRIMARY";
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}
