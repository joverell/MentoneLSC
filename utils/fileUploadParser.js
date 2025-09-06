import formidable from 'formidable';

/**
 * Parses a multipart form request.
 * @param {import('next').NextApiRequest} req - The request object.
 * @returns {Promise<{fields: formidable.Fields, files: formidable.Files}>}
 */
export const parseForm = (req) => {
    return new Promise((resolve, reject) => {
        const form = formidable({});
        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('Error parsing the form with formidable:', err);
                return reject(new Error('Error parsing form data.'));
            }
            resolve({ fields, files });
        });
    });
};

/**
 * Config for Next.js API routes that use this parser.
 * Disables the default body parser to allow formidable to work.
 */
export const fileUploadConfig = {
    api: {
        bodyParser: false,
    },
};
