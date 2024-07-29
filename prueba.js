const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainTextPassword = 'brandon0902';
const hashedPassword = '$2b$10$.9N6VwYD8v/LkNnLOxQYweswjpfLzDTIkbZ9JB55P.bovhYC/AclW';

// Generar un hash para la misma contraseña (solo para fines de prueba)
async function generateHash() {
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(plainTextPassword, salt);
  console.log(hash);
}

generateHash();

// Comparar la contraseña plana con el hash generado
async function comparePasswords() {
  const match = await bcrypt.compare(plainTextPassword, hashedPassword);
  console.log(match? 'Passwords match' : 'Passwords do not match');
}

comparePasswords();
