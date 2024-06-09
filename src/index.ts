import express, { Request, Response } from "express";
import CustomerModel from "./customer.model";
import { Customer } from "./types";

const app = express();
const PORT = 5000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send({
    msgg: "Welcome to my assigment for Bitespeed backend role",
    name: "Aditya raj",
    email: "aytida.dev@gmail.com",
    linkedIn: "https://www.linkedin.com/in/rayzr",
  });
});

app.post("/identify", async (req: Request, res: Response) => {
  console.log(req.body);

  if (!req.body) {
    res.status(400).send({
      message: "Request body is required",
    });
    return;
  }

  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    res.status(400).send({
      message: "Email or Phone Number is required ",
    });
    return;
  }

  if (email && typeof email !== "string") {
    res.status(400).send({
      message: "Email should be a string",
    });
    return;
  }

  if (phoneNumber && typeof phoneNumber !== "string") {
    res.status(400).send({
      message: "Phone Number should be a string",
    });
    return;
  }

  try {
    let primaryContact: any = await CustomerModel.getPrimaryContact(
      email,
      phoneNumber
    );

    let secondaryContact: any = [null];
    // res.send(primaryContact);
    // return;

    if (!primaryContact.length) {
      console.log("created");

      const data: Customer = {
        email: email,
        phoneNumber: phoneNumber,
        linkPrecedence: "PRIMARY",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newContact = new CustomerModel(data);
      const response: any = await CustomerModel.createPrimaryContact(
        newContact
      );

      primaryContact = [
        {
          id: response.id,
          email: email,
          phoneNumber: phoneNumber,
        },
      ];
    } else if (primaryContact.length === 1) {
      if (
        (email && primaryContact[0].email !== email) ||
        (phoneNumber && primaryContact[0].phoneNumber !== phoneNumber)
      ) {
        const data: Customer = {
          email: email,
          phoneNumber: phoneNumber,
          linkPrecedence: "SECONDARY",
          linkedId: primaryContact[0].id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const newContact = new CustomerModel(data);
        await CustomerModel.createSecondaryContact(newContact);
      }

      secondaryContact = await CustomerModel.getSecondaryContacts(
        primaryContact[0].id
      );
    } else if (primaryContact.length > 1) {
      const newSecondaryContact = [];

      for (let i = 1; i < primaryContact.length; i++) {
        newSecondaryContact.push(primaryContact[i].id);
      }

      const promise = newSecondaryContact.map(async (id) => {
        await CustomerModel.updateLinkedId(primaryContact[0].id, id);
      });

      await Promise.all([
        await CustomerModel.convertPrimaryToSecondary(
          newSecondaryContact,
          primaryContact[0].id
        ),
        ...promise,
      ]);

      secondaryContact = await CustomerModel.getSecondaryContacts(
        primaryContact[0].id
      );
    }

    const contact = responseFormatter(primaryContact[0], secondaryContact[0]);

    res.send({
      contact,
    });
  } catch (error) {
    console.log(error);

    res.status(500).send({
      message: "Internal Server Error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function responseFormatter(primary: any, secondary: any) {
  let allEmails = [];
  let allNumbers = [];

  if (secondary) {
    allEmails = secondary.emails
      .split(",")
      .filter((email: string) => email !== primary.email);
    allNumbers = secondary.numbers
      .split(",")
      .filter((phoneNumber: string) => phoneNumber !== primary.phoneNumber);
  }

  const contact = {
    primaryContactId: primary.id,
    emails: [primary.email, ...allEmails],
    phoneNumbers: [primary.phoneNumber, ...allNumbers],
    secondaryContactIds: secondary ? secondary.ids.split(",") : [],
  };

  return contact;
}
