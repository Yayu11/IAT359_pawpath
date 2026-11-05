import * as SQLite from "expo-sqlite";

let databasePromise;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("pawpath.db");
  }
  return databasePromise;
}

export async function initializeProfileDB() {
  const db = await getDatabase();

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      photo_uri TEXT
    );

    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      breed TEXT,
      birthday TEXT,
      sex TEXT,
      photo_uri TEXT
    );
  `);
}

export async function getUserProfile(userId) {
  const db = await getDatabase();
  return db.getFirstAsync(
    "SELECT * FROM user_profiles WHERE user_id = ?",
    userId,
  );
}

export async function saveUserPhoto(userId, photoUri) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO user_profiles (user_id, photo_uri)
     VALUES (?, ?)
     ON CONFLICT(user_id)
     DO UPDATE SET photo_uri = excluded.photo_uri`,
    userId,
    photoUri,
  );
}

export async function getPets(userId) {
  const db = await getDatabase();
  return db.getAllAsync(
    "SELECT * FROM pets WHERE user_id = ? ORDER BY id DESC",
    userId,
  );
}

export async function getPet(petId, userId) {
  const db = await getDatabase();
  return db.getFirstAsync(
    "SELECT * FROM pets WHERE id = ? AND user_id = ?",
    petId,
    userId,
  );
}

export async function addPet(userId, pet) {
  const db = await getDatabase();
  return db.runAsync(
    `INSERT INTO pets
      (user_id, name, breed, birthday, sex, photo_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    userId,
    pet.name,
    pet.breed,
    pet.birthday,
    pet.sex,
    pet.photoUri,
  );
}

export async function updatePet(petId, userId, pet) {
  const db = await getDatabase();
  return db.runAsync(
    `UPDATE pets
     SET name = ?, breed = ?, birthday = ?, sex = ?, photo_uri = ?
     WHERE id = ? AND user_id = ?`,
    pet.name,
    pet.breed,
    pet.birthday,
    pet.sex,
    pet.photoUri,
    petId,
    userId,
  );
}
