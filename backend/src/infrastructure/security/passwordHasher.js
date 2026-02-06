"use strict";

const bcrypt = require("bcryptjs");

class PasswordHasher {
  constructor(rounds) {
    this.rounds = rounds;
  }

  async hash(plainText) {
    return bcrypt.hash(plainText, this.rounds);
  }

  async verify(plainText, hash) {
    return bcrypt.compare(plainText, hash);
  }
}

module.exports = {
  PasswordHasher,
};
