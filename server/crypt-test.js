crypt = require('./crypt.js');
var input = process.argv[2];
console.log('ENCRYPTED:');
var encrypted = crypt.encrypt(input);
console.log(encrypted);
console.log('DECRYPTED:');
console.log(crypt.decrypt(encrypted));
