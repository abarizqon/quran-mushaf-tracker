/**
 * Firebase (Firestore) Adapter for Tilawah Tracker
 * Menggunakan modular SDK Firebase v9+.
 */
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc, 
    updateDoc, 
    arrayUnion,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    increment
} from 'https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js';

export default class FirebaseAdapter {
    /**
     * @param {Object} db Instance Firestore db.
     */
    constructor(db) {
        this.db = db;
        this.baseCollection = "tilawah";
    }

    async saveLog(userId, logData) {
        try {
            const logsRef = collection(this.db, this.baseCollection, userId, "logs");
            await addDoc(logsRef, logData);
            return true;
        } catch (error) {
            console.error("Gagal menyimpan log ke Firebase:", error);
            return false;
        }
    }

    async updateStats(userId, newPages, date) {
        try {
            const userRef = doc(this.db, this.baseCollection, userId);
            const userSnap = await getDoc(userRef);
            
            const dt = date instanceof Date ? date : new Date(date);
            const dateStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
            const maxPage = Math.max(...newPages);

            if (userSnap.exists()) {
                const data = userSnap.data();
                
                // Kalkulasi streak
                let newStreak = data.streak || 0;
                if (data.lastReadDate) {
                    const lastDate = new Date(data.lastReadDate);
                    const diffTime = Math.abs(date - lastDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays === 1) {
                        newStreak += 1;
                    } else if (diffDays > 1) {
                        newStreak = 1;
                    }
                } else {
                    newStreak = 1;
                }

                await updateDoc(userRef, {
                    totalReads: increment(1),
                    streak: newStreak,
                    lastReadDate: dateStr,
                    lastReadPage: maxPage,
                    pagesRead: arrayUnion(...newPages)
                });
            } else {
                await setDoc(userRef, {
                    totalPages: 604,
                    totalReads: 1,
                    currentKhatam: 0,
                    streak: 1,
                    lastReadDate: dateStr,
                    lastReadPage: maxPage,
                    pagesRead: newPages,
                    role: "user",
                    nama: "Pengguna"
                });
            }
            return true;
        } catch (error) {
            console.error("Gagal memperbarui statistik Firebase:", error);
            return false;
        }
    }

    async getStats(userId) {
        try {
            const userRef = doc(this.db, this.baseCollection, userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                return userSnap.data();
            }
            return null;
        } catch (error) {
            console.error("Gagal mengambil statistik dari Firebase:", error);
            return null;
        }
    }

    async getLogs(userId, options = {}) {
        try {
            const logsRef = collection(this.db, this.baseCollection, userId, "logs");
            let q = query(logsRef, orderBy("timestamp", "desc"));

            if (options.limit) {
                q = query(q, limit(options.limit));
            }
            if (options.startDate) {
                q = query(q, where("date", ">=", options.startDate));
            }
            if (options.endDate) {
                q = query(q, where("date", "<=", options.endDate));
            }
            if (options.source) {
                q = query(q, where("source", "==", options.source));
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Gagal mengambil log dari Firebase:", error);
            return [];
        }
    }

    async resetKhatam(userId) {
        try {
            const userRef = doc(this.db, this.baseCollection, userId);
            await updateDoc(userRef, {
                currentKhatam: increment(1),
                pagesRead: []
            });
            return true;
        } catch (error) {
            console.error("Gagal mereset khatam di Firebase:", error);
            return false;
        }
    }

    async getAllUserStats() {
        try {
            const colRef = collection(this.db, this.baseCollection);
            const querySnapshot = await getDocs(colRef);
            return querySnapshot.docs.map(doc => ({ userId: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Gagal mengambil semua data statistik:", error);
            return [];
        }
    }
}
