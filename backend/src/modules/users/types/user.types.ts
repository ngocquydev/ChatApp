export type CreateUserData = {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
  firebaseUid?: string;
  avatar?: string;
  dateOfBirth?: string | Date;
};
