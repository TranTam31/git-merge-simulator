/**
 * presets.js — Pre-built merge scenarios for learning
 */

export const presets = [
  {
    id: 'simple-conflict',
    label: '🔴 Simple Conflict',
    description: 'One line edited two different ways on both branches',
    base: `function greet(name) {
  const message = "Hello, " + name;
  console.log(message);
  return message;
}

const result = greet("World");
console.log(result);
`,
    current: `function greet(name) {
  const message = "Hi there, " + name + "!";
  console.log(message);
  return message;
}

const result = greet("World");
console.log(result);
`,
    incoming: `function greet(name) {
  const message = "Hey, " + name + " 👋";
  console.log(message);
  return message;
}

const result = greet("World");
console.log(result);
`,
  },

  {
    id: 'auto-merge',
    label: '🟢 Auto-Merge',
    description: 'Both branches edit different sections — git resolves automatically',
    base: `# Project Config

version: 1.0.0
author: Alice
description: My awesome project

dependencies:
  - lodash
  - axios

scripts:
  build: npm run compile
  test: npm run jest
`,
    current: `# Project Config

version: 2.0.0
author: Alice
description: My awesome project

dependencies:
  - lodash
  - axios

scripts:
  build: npm run compile
  test: npm run jest
`,
    incoming: `# Project Config

version: 1.0.0
author: Alice
description: My awesome project

dependencies:
  - lodash
  - axios
  - react

scripts:
  build: npm run compile
  test: npm run jest
`,
  },

  {
    id: 'mixed',
    label: '🟡 Mixed (Auto + Conflict)',
    description: 'Some lines auto-merge, some sections conflict',
    base: `import React from 'react';

const API_URL = "https://api.example.com";
const TIMEOUT = 5000;
const MAX_RETRIES = 3;

export function fetchData(endpoint) {
  return fetch(API_URL + endpoint, {
    timeout: TIMEOUT,
  });
}

export default fetchData;
`,
    current: `import React from 'react';
import { useState } from 'react';

const API_URL = "https://api.production.com";
const TIMEOUT = 5000;
const MAX_RETRIES = 3;

export function fetchData(endpoint) {
  return fetch(API_URL + endpoint, {
    timeout: TIMEOUT,
  });
}

export default fetchData;
`,
    incoming: `import React from 'react';

const API_URL = "https://api.staging.com";
const TIMEOUT = 10000;
const MAX_RETRIES = 5;

export function fetchData(endpoint) {
  return fetch(API_URL + endpoint, {
    timeout: TIMEOUT,
    retries: MAX_RETRIES,
  });
}

export default fetchData;
`,
  },

  {
    id: 'delete-vs-edit',
    label: '🟠 Delete vs Edit',
    description: 'One branch deletes a block, the other edits it',
    base: `class UserService {
  constructor(db) {
    this.db = db;
  }

  // Legacy method - kept for backwards compat
  getUserById(id) {
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  createUser(data) {
    return this.db.insert('users', data);
  }

  deleteUser(id) {
    return this.db.delete('users', id);
  }
}
`,
    current: `class UserService {
  constructor(db) {
    this.db = db;
  }

  // Legacy method - kept for backwards compat
  getUserById(id) {
    console.warn('Deprecated: use getUserV2 instead');
    return this.db.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  createUser(data) {
    return this.db.insert('users', data);
  }

  deleteUser(id) {
    return this.db.delete('users', id);
  }
}
`,
    incoming: `class UserService {
  constructor(db) {
    this.db = db;
  }

  createUser(data) {
    return this.db.insert('users', data);
  }

  deleteUser(id) {
    return this.db.delete('users', id);
  }
}
`,
  },
];
