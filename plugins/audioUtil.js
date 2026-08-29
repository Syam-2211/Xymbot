const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const NodeID3 = require('node-id3');
const crypto = require('crypto');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Converts audio to MP3 and injects ID3 tags.
 * @param {Buffer} audioBuffer - The original audio buffer
 * @param {string} title - The track title
 * @param {string} artist - The track artist
 * @param {Buffer} imageBuffer - The album art image buffer
 * @returns {Promise<Buffer>} The tagged MP3 buffer
 */
async function tagAudio(audioBuffer, title, artist, imageBuffer) {
    return new Promise((resolve, reject) => {
        const tmpId = crypto.randomBytes(6).toString('hex');
        const inputPath = path.join(__dirname, '../tmp', `in_${tmpId}.tmp`);
        const outputPath = path.join(__dirname, '../tmp', `out_${tmpId}.mp3`);

        fs.writeFileSync(inputPath, audioBuffer);

        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('error', (err) => {
                fs.unlinkSync(inputPath);
                reject(err);
            })
            .on('end', () => {
                fs.unlinkSync(inputPath);
                try {
                    const tags = {
                        title: title,
                        artist: artist,
                        image: {
                            mime: "jpeg",
                            type: {
                                id: 3,
                                name: "front cover"
                            },
                            description: "Thumbnail",
                            imageBuffer: imageBuffer
                        }
                    };

                    const success = NodeID3.write(tags, outputPath);
                    if (!success) {
                        throw new Error("Failed to write ID3 tags");
                    }

                    const finalBuffer = fs.readFileSync(outputPath);
                    fs.unlinkSync(outputPath);
                    resolve(finalBuffer);
                } catch (err) {
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    reject(err);
                }
            })
            .save(outputPath);
    });
}

module.exports = { tagAudio };
