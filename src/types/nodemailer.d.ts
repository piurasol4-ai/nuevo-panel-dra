declare module "nodemailer" {
  type SendMailOptions = Record<string, unknown>;

  type Transporter = {
    verify: () => Promise<void>;
    sendMail: (options: SendMailOptions) => Promise<unknown>;
  };

  type CreateTransportOptions = Record<string, unknown>;

  const nodemailer: {
    createTransport: (options: CreateTransportOptions) => Transporter;
  };

  export default nodemailer;
}

