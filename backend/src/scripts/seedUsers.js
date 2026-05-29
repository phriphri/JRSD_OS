// ============================================================
//  J-RSD OS — Script de seed de la base de données
//  Fichier : backend/src/scripts/seedUsers.js
//
//  Usage : node src/scripts/seedUsers.js
//  NPM  :  npm run db:seed
// ============================================================

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

const usersToInsert = [
  {
    nom_prenom: 'Phrasia Mosengo',
    email: 'mosengophrasia1@gmail.com',
    password_clair: '000',
    fonction: 'Développeur / Admin Principal',
    role: 'admin',
  }
];

const invitationsToInsert = [
  {
    code: 'J-RSD-2026',
    expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // Valide 1 an
  }
];

async function seedUsers() {
  console.log('🌱 Début du seed des utilisateurs...');
  try {
    for (const user of usersToInsert) {
      // Vérifier si l'utilisateur existe déjà
      const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [user.email]);
      
      if (existing.length === 0) {
        // Hacher le mot de passe
        const hashedPassword = await bcrypt.hash(user.password_clair, 10);
        
        // Insérer
        await pool.execute(
          `INSERT INTO users (nom_prenom, email, password, fonction, role) VALUES (?, ?, ?, ?, ?)`,
          [user.nom_prenom, user.email, hashedPassword, user.fonction, user.role]
        );
        console.log(`✅ Utilisateur ajouté : ${user.email} (Rôle: ${user.role}, Fonction: ${user.fonction})`);
      } else {
        console.log(`ℹ️ L'utilisateur ${user.email} existe déjà, ignoré.`);
      }
    }
    for (const inv of invitationsToInsert) {
      const [existingInv] = await pool.execute('SELECT id FROM workspace_invitations WHERE code = ?', [inv.code]);
      if (existingInv.length === 0) {
        await pool.execute(
          `INSERT INTO workspace_invitations (code, expires_at, is_used) VALUES (?, ?, FALSE)`,
          [inv.code, inv.expires_at]
        );
        console.log(`✅ Code d'invitation généré : ${inv.code}`);
      } else {
        console.log(`ℹ️ Le code ${inv.code} existe déjà.`);
      }
    }

    console.log('🎉 Seed terminé avec succès.');
  } catch (err) {
    console.error('❌ Erreur lors du seed :', err.message);
  } finally {
    process.exit(0);
  }
}

seedUsers();
