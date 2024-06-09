import { QueryError, QueryResult, RowDataPacket } from "mysql2";
import sql from "./db";
import { Customer } from "./types";

function CustomerModel(this: Customer, data: Customer) {
  this.phoneNumber = data.phoneNumber;
  this.email = data.email;
  this.linkedId = data.linkedId;
  this.linkPrecedence = data.linkPrecedence;
  this.createdAt = data.createdAt;
  this.updatedAt = data.updatedAt;
  this.deletedAt = data.deletedAt;
}

CustomerModel.getPrimaryContact = async (
  email: string,
  phoneNumber: string
) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "SELECT * FROM customer WHERE email = ? OR phoneNumber = ? ORDER BY FIELD(linkPrecedence, 'PRIMARY', 'SECONDARY')",
      [email, phoneNumber],
      (err, res: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (res.length === 0) {
          resolve([]);
          return;
        }

        let primaryIdSet = new Set();
        let linkedIdSet = new Set();

        res.map((contact) => {
          if (contact.linkPrecedence === "PRIMARY") {
            primaryIdSet.add(contact.id);
          } else {
            primaryIdSet.add(contact.linkedId);
          }
        });

        const primaryIdArr = Array.from(primaryIdSet);
        console.log(primaryIdArr);

        sql.query(
          `SELECT * FROM customer WHERE id IN (?) ORDER BY id`,
          [primaryIdArr],
          (err, res) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(res);
          }
        );
      }
    );
  });
};

CustomerModel.getSecondaryContacts = async (linkedId: number) => {
  return new Promise((resolve, reject) => {
    const query = `
    SELECT 
    GROUP_CONCAT(DISTINCT email) AS emails,
    GROUP_CONCAT(DISTINCT phoneNumber) AS numbers,
    GROUP_CONCAT(DISTINCT id) AS ids
    FROM 
      customer 
    WHERE 
      linkedId = ?
    GROUP BY
      linkPrecedence 
      
    `;

    sql.query(query, [linkedId], (err, res) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(res);
    });
  });
};

CustomerModel.createPrimaryContact = async (data: Customer) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "INSERT INTO customer SET ?",
      data,
      (err: QueryError, res: any) => {
        if (err) {
          reject(err);
          return;
        }

        resolve({ id: res.insertId, ...data });
      }
    );
  });
};

CustomerModel.createSecondaryContact = async (data: Customer) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "INSERT INTO customer SET ?",
      data,
      (err: QueryError, res: any) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            resolve({ id: null });
            return;
          }

          reject(err);
          return;
        }

        resolve({ id: res.insertId, ...data });
      }
    );
  });
};

CustomerModel.convertPrimaryToSecondary = async (
  id: number[],
  linkedId: number
) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "UPDATE customer SET linkPrecedence = 'SECONDARY', linkedId = ? WHERE id IN (?)",
      [linkedId, id],
      (err: QueryError, res: any) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(res);
      }
    );
  });
};

CustomerModel.updateLinkedId = async (newId: number, linkedId: number) => {
  return new Promise((resolve, reject) => {
    sql.query(
      "UPDATE customer SET linkedId = ? WHERE linkedId = ?",
      [newId, linkedId],
      (err: QueryError, res: any) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(res);
      }
    );
  });
};

export default CustomerModel;
