const mysql = require('mysql');
const crypto = require('crypto');

class RADM {
    /**
     * @constructor
     */
    constructor() {
        this.storage = {};
        this.CHUNKSIZE = 1024; // size of the chunks that a stored (max chunksize is 1024)
        this.conn = mysql.createConnection({ host: "localhost", user: "root", password: "", database: "radm_testing" });
    }

    /**
     * @public
     */
    dispose() {
        this.conn.end();
    }

    // Private functions //

    /**
     * @param {String} str
     * @returns {String|Boolean} cleanedString or false if a string is not supplied
     * @private
     */
    _cleanString(str) {
        if (typeof str == "string") {
            return str.trim().toLowerCase();
        } else {
            return str;
        }
    }

    /**
     * @param {String} tableName
     * @returns {Boolean} true if table exists or false if not
     * @private
     */
    _checkIfTableExists(tableName) {
        tableName = this._cleanString(tableName);

        for (key in this.storage) {
            if (key == tableName) {
                return true;
            }
        }
        return false;
    }

    /**
     * @param {String} tableName
     * @param {String} keyToCheck
     * @returns {Boolean} true if key exists in table - false otherwise 
     * @private
     */
    _checkIfKeyExistsInTable(tableName, keyToCheck) {
        tableName = this._cleanString(tableName);
        keyToCheck = this._cleanString(keyToCheck);

        for (keys in Object.keys(this.storage[tableName])) {
            if (keys == keyToCheck) {
                return true;
            }
        }
        return false;
    }

    // Public functions //

    /**
     * @param {String} tableName
     * @returns {Boolean} returns true if table is created - false if table exists already or tablename isn't supplied
     * @public
     */
    addTable(tableName) {
        tableName = this._cleanString(tableName);

        if (tableName == undefined || tableName == "") {
            return false;
        } else if (this._checkIfTableExists(tableName)) {
            return false;
        } else {
            this.storage[tableName] = {};
            return true;
        }
    }

    /**
     * @param {String} tableName
     * @param {String} documentKey
     * @param {String|Int|Boolean} DocumentValue
     * @returns {Boolean} returns true if document is created - otherwise false
     * @public
     */
    addDocument(tableName, documentKey, documentValue) {
        tableName = this._cleanString(tableName);
        documentKey = this._cleanString(documentKey);
        documentValue = this._cleanString(documentValue);

        if (this._checkIfTableExists(tableName)) {
            if (this._checkIfKeyExistsInTable(tableName, documentKey)) {
                return false;
            }

            this.storage[tableName][documentKey] = documentValue;
            return true;
        }
    }

    // Snapshotting functions //

    /**
     * @returns {String} returns snapshot id (UUID)
     * @private
     */
    _generateSnapshotId() {
        return crypto.randomUUID();
    }

    /**
     * @param {String} chunk
     * @param {String} snapshotId
     * @returns {Boolean} True if chunk was stored - false otherwise
     * @private
     */
    _storeChunk(chunk, snapshotId) {
        this.conn.query("INSERT INTO chunks (chunkdata, chunkid) VALUES (?, ?)", [chunk, snapshotId], (err, _) => {
            if (err) return false;
            return true;
        });
    }

    /**
     * @param {String} data
     * @returns {Boolean} true if all data is chunked and stored
     * @private
     */
    _splitIntoChunksAndStore(data) {
        let chunk = "";
        let first = true;
        let snapshotId = this._generateSnapshotId();

        for (let i = 0; i < data.length; i++) {
            chunk += data[i];
            if (i % this.CHUNKSIZE == 0) {
                if (first) {
                    first = false;
                    continue;
                }
                this._storeChunk(chunk, snapshotId);
                chunk = ""
            }
        }
        this._storeChunk(chunk, snapshotId);
        return true;
    }

    /**
     * @returns {boolean} True if databased was snapshotted - false otherwise
     * @public
     */
    snapShot() {
        let data = JSON.stringify(this.storage);

        if (this._splitIntoChunksAndStore(data)) {
            return true;
        }
        return false;
    }

    /**
     * @param {string} chunkId
     * @returns {Promise} returns promise, resolve data or reject error
     * @public
     */
    restoreStoragebyChunkId(chunkId) {
        this.conn.query("SELECT chunkdata FROM chunks WHERE chunkid = ? ORDER BY id ASC", [chunkId], (err, result) => {
            if(err) return err;
            let finalChunk = "";

            for (const row in result) {
                if (Object.hasOwnProperty.call(result, row)) {
                    const element = result[row]["chunkdata"];

                    finalChunk += element;
                }
            }
            this.storage = JSON.parse(finalChunk);
        });
    }
}

module.exports = RADM;