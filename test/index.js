/* global process */
const fs = require('fs');
const hash = require('../');
const { rollup } = require('rollup');
const chai = require('chai');
const expect = chai.expect;
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
process.chdir('test');

const results = {
	'md5': '07d2bf0d12655d9f51c0637718da4889.js',
	'sha1': '56770a64be1a1132502b276c4132a76bb94d9e1b.js',
	'manifest': 'manifest.json',
	'manifestCustomInput': 'manifestCustomInput.json'
};

function hashWithOptions(options) {
	return rollup({
		input: 'fixtures/index.js',
		plugins: [
			hash(options)
		]
	}).then(bundle => {
		return bundle.write({
			format: 'es',
			file: 'tmp/index.js'
		});
	});
}

function rmDirectoryRecursive(path) {
	if(fs.existsSync(path)) {
		fs.readdirSync(path).forEach(file => {
			const curPath = `${path}/${file}`;
			if(fs.lstatSync(curPath).isDirectory()) {
				rmDirectoryRecursive(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};

describe('rollup-plugin-hash', () => {

	afterEach(() => {
		rmDirectoryRecursive('tmp');
	});

	it('should hash destination filenames', () => {
		const res = hashWithOptions({ dest: 'tmp/[hash].js' });
		return expect(res).to.be.fulfilled;
	});

	it('should fail if no destination string supplied', () => {
		const res = hashWithOptions({});
		return expect(res).to.be.rejected;
	});

	it(`should fail if supplied algorithm isn't supported`, () => {
		const res = hashWithOptions({ dest: 'tmp/[hash].js', algorithm: 'foo' });
		return expect(res).to.be.rejected;
	});

	it('should replace dest filename template with hash of bundle', () => {
		const res = hashWithOptions({ dest: 'tmp/[hash].js' });
		return res.then(() => {
			const tmp = fs.readdirSync('tmp');
			expect(tmp).to.contain(results.sha1);
		});
	});

	it('should support alternative hashing algorithms if configured', () => {
		const res = hashWithOptions({ dest: 'tmp/[hash].js', algorithm: 'md5' });
		return res.then(() => {
			const tmp = fs.readdirSync('tmp');
			expect(tmp).to.contain(results.md5);
		});
	});

	it('should replace original bundle with hashed version if configured', () => {
		const res = hashWithOptions({ dest: 'tmp/[hash].js', replace: true });
		return res.then(() => {
			const tmp = fs.readdirSync('tmp');
			expect(tmp).to.have.length(1);
			expect(tmp).to.contain(results.sha1);
		});
	});

	it(`should create dest folder structure if doesn't exist`, () => {
		const res = hashWithOptions({ dest: 'tmp/test/[hash].js' });
		return res.then(() => {
			const isDirectory = fs.lstatSync('tmp/test').isDirectory();
			expect(isDirectory).to.be.true;
		});
	});

	it('should support the hashing being a directory name', () => {
		const res = hashWithOptions({ dest: 'tmp/[hash]/index.js' });
		return res.then(() => {
			const hash = results.sha1.replace('.js', '');
			const isDirectory = fs.lstatSync('tmp/' + hash).isDirectory();
			expect(isDirectory).to.be.true;
		});
	});

	it('should create a manifest.json if configured', () => {
		const res = hashWithOptions({ dest: 'tmp/[hash].js', manifest: 'tmp/manifest.json' });
		return res.then(() => {
			const tmp = fs.readdirSync('tmp');
			const manifest = require('./tmp/manifest.json');
			expect(tmp).to.contain(results.manifest);
			expect(manifest).to.be.an('object');
			expect(manifest).to.have.property('tmp/index.js');
			expect(manifest['tmp/index.js']).to.equal('tmp/' + results.sha1);
		});
	});

	it('should support custom manifest input name', () => {
		const res = hashWithOptions({ manifestKey: 'custom/dir/index.js', dest: 'tmp/[hash].js', manifest: 'tmp/manifestCustomInput.json' });
		return res.then(() => {
			const tmp = fs.readdirSync('tmp');
			const manifest = require('./tmp/manifestCustomInput.json');
			expect(tmp).to.contain(results.manifestCustomInput);
			expect(manifest).to.be.an('object');
			expect(manifest).to.have.property('custom/dir/index.js');
			expect(manifest['custom/dir/index.js']).to.equal('tmp/' + results.sha1);
		});
	});

});
