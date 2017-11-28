import hasha from 'hasha';
import fs from 'fs';
import path from 'path';

const algorithms = {
	'md5': true,
	'sha1': true,
	'sha256': true,
	'sha512': true
};

const defaultOptions = {
	algorithm: 'sha1',
	replace: false
};

const msg = {
	noTemplate: '[Hash] Destination filename must contain `[hash]` template.',
	noAlgorithm: '[Hash] Algorithm can only be one of: md5, sha1, sha256, sha512',
	noManifest: '[Hash] Manifest filename must be a string',
	noManifestKey: '[Hash] Key for manifest filename must be a string'
};

const pattern = /\[hash(?::(\d+))?\]/;

function hasTemplate(dest) {
	return pattern.test(dest);
}

function generateManifest(input, output) {
	return JSON.stringify({[input]: output});
}

function formatFilename(dest, hash) {
	const match = pattern.exec(dest);
	const length = match && match[1];
	let hashResult = hash;
	if (length) {
		hashResult = hash.substr(0, +length);
	}
	return dest.replace(pattern, hashResult);
}

function mkdirpath (dest) {
	const dir = path.dirname(dest);
	try {
		fs.readdirSync(dir);
	} catch ( err ) {
		mkdirpath( dir );
		fs.mkdirSync( dir );
	}
}

function logError(msg) {
	throw new Error(msg);
}

export default function hash(opts = {}) {
	const options = Object.assign({}, defaultOptions, opts);

	return {
		name: 'hash',
		onwrite: function(bundle, data) {
			const destinationOption = options.output ? options.output.file : options.dest;
			const builtFile = bundle.file || bundle.dest;

			if(!destinationOption || !hasTemplate(destinationOption)) {
				logError(msg.noTemplate);
				return false;
			}

			if(!algorithms[options.algorithm]) {
				logError(msg.noAlgorithm);
				return false;
			}

			if(options.manifest && typeof options.manifest !== 'string') {
				logError(msg.noManifest);
				return false;
			}

			if(options.manifestKey && typeof options.manifestKey !== 'string') {
				logError(msg.noManifestKey);
				return false;
			}

			const hash = hasha(data.code, options);
			const fileName = formatFilename(destinationOption, hash);

			if(options.replace) {
				fs.unlinkSync(builtFile);
			}

			if(options.manifest) {
				const manifest = generateManifest(options.manifestKey || builtFile, fileName);
				mkdirpath(options.manifest);
				fs.writeFileSync(options.manifest, manifest, 'utf8');
			}

			mkdirpath(fileName);

			let code = data.code;
			if (bundle.sourcemap) {
				const basename = path.basename(fileName);
				data.map.file = basename;

				let url;
				if (bundle.sourcemap === 'inline') {
					url = data.map.toUrl();
				} else {
					url = basename + '.map';
					fs.writeFileSync(fileName + '.map', data.map.toString());
				}

				code += `\n//# sourceMappingURL=${url}`;
			}

			fs.writeFileSync(fileName, code, 'utf8');

			if(options.callback && typeof options.callback === 'function') {
				options.callback(fileName);
			}
		}
	};
}
