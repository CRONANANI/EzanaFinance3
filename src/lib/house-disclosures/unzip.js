/**
 * Minimal, dependency-free ZIP reader — enough to pull the single <YEAR>FD.txt
 * out of the House Clerk's tiny yearly zip (~70KB). The repo has no zip library
 * and we don't want to add one for this; Node's zlib does the inflate, and the
 * ZIP container is walked by hand via the central directory.
 *
 * Supports STORED (method 0) and DEFLATE (method 8) entries — all the Clerk uses.
 * Returns a Map of entryName → Buffer. Not a general-purpose unzip (no ZIP64, no
 * encryption) — just what this ingest needs.
 */
import zlib from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CDH_SIG = 0x02014b50;

function findEocd(buf) {
  // EOCD is near the end; scan backwards for its signature (min record = 22 bytes).
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) return i;
  }
  return -1;
}

/** Parse a ZIP buffer into a Map(name → Buffer). Throws on a malformed archive. */
export function unzipEntries(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const eocd = findEocd(buf);
  if (eocd < 0) throw new Error('not a zip (no EOCD)');

  const total = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16); // start of central directory

  const out = new Map();
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(off) !== CDH_SIG) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);

    // Jump to the local header to find where the entry's data actually starts
    // (its name/extra lengths can differ from the central-directory record).
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const comp = buf.subarray(dataStart, dataStart + compSize);

    let data;
    if (method === 0) data = Buffer.from(comp); // stored
    else if (method === 8) data = zlib.inflateRawSync(comp); // deflate
    else throw new Error(`unsupported zip method ${method} for ${name}`);
    out.set(name, data);

    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
