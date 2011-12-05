crypt = require('./crypt.js');
var input = process.argv[2];
console.log('ENCRYPTED:');
console.log(crypt.encrypt(input));
console.log('DECRYPTED:');
console.log(crypt.decrypt(input));
