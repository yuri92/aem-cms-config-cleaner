import { groupBy } from 'lodash-es';

const MULTIFIELD_REGEX = /(.item)(\d+)/;

export const processJson = toProcess => {
    let json = flatten(toProcess);

    for (const [key, value] of Object.entries(json)) {
        let newKey = key.replace(/jcr:content./, '');
        newKey = newKey.replace(/content./, '');
        newKey = camelize(newKey, '-');
        newKey = camelize(newKey, ':');
        newKey = camelize(newKey);
        renameKey(json, key, newKey);
    }
    processMultifield(json);
    json = unflatten(json);
    return json;
}

/**
 * Trasforma il json in un oggetto piatto suddiviso dal carattere '.'
 */
function flatten(data) {
    const result = {};
    const recurse = (cur, prop) => {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            const l = cur.length;
            for (let i = 0; i < l; i++) {
                recurse(cur[i], prop + '[' + i + ']');
            }
            if (l === 0) {
                result[prop] = [];
            }
        } else {
            let isEmpty = true;

            // tslint:disable-next-line:forin
            for (const p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + '.' + p : p);
            }
            if (isEmpty && prop) {
                result[prop] = {};
            }
        }
    };
    recurse(data, '');
    return result;
}

/**
 * Processo inverso, trasforma un oggetto piatto in nested
 */
function unflatten(data) {
    if (Object(data) !== data || Array.isArray(data)) {
        return data;
    }
    const regex = /\.?([^.\[\]]+)|\[(\d+)\]/g;
    const resultholder = {};
    // tslint:disable-next-line:forin
    for (const p in data) {
        let cur = resultholder;
        let prop = '';
        let m;
        // tslint:disable-next-line:no-conditional-assignment
        while (m = regex.exec(p)) {
            cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
            prop = m[2] || m[1];
        }
        cur[prop] = data[p];
    }
    return resultholder[''] || resultholder;
}

function capitalize(word) {
    return `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`;
}

/**
 * Trasforma una stringa in camelCase togliendo di default il carattere '_'
 */
function camelize(text, separator = '_') {
    const words = text.split(separator);
    const result = [words[0]];
    words.slice(1).forEach((word) => result.push(capitalize(word)));
    return result.join('');
}

/**
 * Dati gli input, sostituisce la chiave indicata con quella desiderata
 */
function renameKey(obj, oldKey, newKey) {
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
}

function processMultifield(json) {
    let keys = [];
    for (const [key, value] of Object.entries(json)) {
        const m = MULTIFIELD_REGEX.exec(key);
        if (m !== null) {
            keys.push(key);
        }
    }

    
    keys = groupBy(keys, item => {
        const splitted = item.split('.');
        splitted.pop();
        splitted.pop();
        
        return splitted.join('.');
    });
    
    for (const [key, value] of Object.entries(keys)) {
        
        const itemKeys = new Set();
        value.forEach(v => {
            const valueSplit = v.split('.');
            const itemName = valueSplit[valueSplit.length - 2];
            itemKeys.add(itemName)
        });

        const chunkedArray = [];
        itemKeys.forEach(k => {
            const filteredItemsByKey = value.filter(v => {
                const valueSplit = v.split('.');
                const itemName = valueSplit[valueSplit.length - 2];
                return itemName === k
            })
            chunkedArray.push(filteredItemsByKey)
        })

        let i = 0;
        chunkedArray.forEach(arr => {
            arr.forEach(oldKey => {
                const newKey = oldKey.replace(MULTIFIELD_REGEX, `[${i}]`);
                renameKey(json, oldKey, newKey);
            });
            i++;
        });
    }

}