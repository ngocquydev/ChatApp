export type CreateUserData = {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  firebaseUid?: string;
  avatar?: string;
  dateOfBirth?: string | Date;
};
