const fs = require('fs');
const path = require('path');
const util = require('util');
const tar = require('tar');
const sha256 = require('js-sha256');
const { networks: truffleNetworks } = require('./truffle');
const simpleGit = require('simple-git/promise');
const moment = require('moment');
const whitelist = require('./ContractDeploymentWhiteList.json');
const readline = require('readline');
const readdir = util.promisify(fs.readdir);
const buildPath = path.join(__dirname, 'build');
const contractsBuildPath = path.join(__dirname, 'build', 'contracts');
const buildBackupPath = path.join(__dirname, 'build', 'contracts.bak');
const twoKeyProtocolDir = path.join(__dirname, '2key-protocol', 'src');
const twoKeyProtocolDist = path.join(__dirname, '2key-protocol', 'dist');
const twoKeyProtocolLibDir = path.join(__dirname, '2key-protocol', 'dist');
const twoKeyProtocolSubmodulesDir = path.join(__dirname, '2key-protocol', 'dist', 'submodules');
const contractsGit = simpleGit();
const twoKeyProtocolLibGit = simpleGit(twoKeyProtocolLibDir);
const twoKeyProtocolSrcGit = simpleGit(twoKeyProtocolDir);

const tenderlyDir = path.join(__dirname, 'tenderlyConfigurations');

const buildArchPath = path.join(twoKeyProtocolDir, 'contracts{branch}.tar.gz');
let deployment = process.env.FORCE_DEPLOYMENT || false;

const {
    runProcess,
    runDeployTokenSellCampaignMigration,
    runDeployDonationCampaignMigration,
    runUpdateMigration,
    rmDir,
    getGitBranch,
    slack_message,
    sortMechanism,
    ipfsAdd,
    ipfsGet,
    runDeployCPCCampaignMigration,
    runDeployCPCFirstTime,
    runTruffleCompile,
    runDeployPlasmaReputation,
    runDeployPPCNoRewards,
    runDeployCPCNoRewardsMigration,
    runDeployPaymentHandlersMigration
} = require('./helpers');



const branch_to_env = {
    "develop": "test",
    "staging": "staging",
    "master": "prod"
};

const deployedTo = {};

let contractsStatus;


/**
 * Function which will get the difference between the latest tags depending on current branch we're using. Either on merge requests or on current branch.
 * @returns {Promise<void>}
 */
const getDiffBetweenLatestTags = async () => {
    const tagsDevelop = (await contractsGit.tags()).all.filter(item => item.endsWith('-develop')).sort(sortMechanism);
    let latestTagDev = tagsDevelop[tagsDevelop.length-1];

    const tagsStaging = (await contractsGit.tags()).all.filter(item => item.endsWith('-staging')).sort(sortMechanism);
    let latestTagStaging = tagsStaging[tagsStaging.length-1];


    const tagsMaster = (await contractsGit.tags()).all.filter(item => item.endsWith('-master')).sort(sortMechanism);
    let latestTagMaster = tagsMaster[tagsMaster.length-1];

    let status = await contractsGit.status();
    let diffParams;

    if(status.current == 'staging') {
        diffParams = latestTagStaging;
    } else if(status.current == 'develop') {
        diffParams = latestTagDev;
    } else if(status.current == 'master') {
        diffParams = latestTagMaster;
    }


    let diffAllContracts = (await contractsGit.diffSummary(diffParams)).files.filter(item => item.file.endsWith('.sol')).map(item => item.file);

    let singletonsChanged = diffAllContracts.filter(item => item.includes('/singleton-contracts/') || item.includes('/token-pools')).map(item => item.split('/').pop().replace(".sol",""));
    let tokenSellCampaignChanged = diffAllContracts.filter(item => item.includes('/acquisition-campaign-contracts/')|| item.includes('/campaign-mutual-contracts/')).map(item => item.split('/').pop().replace(".sol",""));
    let donationCampaignChanged = diffAllContracts.filter(item => item.includes('/campaign-mutual-contracts/') || item.includes('/donation-campaign-contracts/')).map(item => item.split('/').pop().replace(".sol",""));
    let cpcChanged = diffAllContracts.filter(item => item.includes('/cpc-campaign-contracts/')).map(item => item.split('/').pop().replace(".sol",""));
    let cpcNoRewardsChanged = diffAllContracts.filter(item => item.includes('/cpc-campaign-no-rewards/')).map(item => item.split('/').pop().replace(".sol",""));

    //Restore from archive the latest build so we can check which contracts are new
    restoreFromArchive();

    //Check the files which have never been deployed and exclude them from script
    for(let i=0; i<singletonsChanged.length; i++) {
        if(!checkIfContractDeployedEver(singletonsChanged[i])) {
            singletonsChanged.splice(i,1);
            i = i-1; //catch when 2 contracts we're removing are one next to another
        }
    }
    return [
        singletonsChanged,
        tokenSellCampaignChanged.length > 0,
        donationCampaignChanged.length > 0,
        cpcChanged.length > 0,
        cpcNoRewardsChanged.length > 0
    ];
};

const checkIfContractDeployedEver = (contractName) => {
    let artifactPath = `./build/contracts/${contractName}.json`
    let build = {};
    if (fs.existsSync(artifactPath)) {
        build = JSON.parse(fs.readFileSync(artifactPath, { encoding: 'utf-8' }));
        if(Object.keys(build.networks).length > 0) {
            // this means contract is deployed
            return true;
        }
        return false;
    } else {
        return false;
    }

}

const generateChangelog = async () => {
    await runProcess('git-chglog',['-o','CHANGELOG.md'])
};

const getBuildArchPath = () => {
    if(contractsStatus && contractsStatus.current) {
        return buildArchPath.replace('{branch}',`-${contractsStatus.current}`);
    }
    return buildArchPath;
};

const pullTenderlyConfiguration = async () => {
    let branch = await getGitBranch();
    let origin = `${tenderlyDir}/tenderly-${branch}.yaml`;
    let destination = 'tenderly.yaml';

    console.log(`${origin} will be copied to ${destination}`);

    fs.copyFile(origin, 'tenderly.yaml' , (err) => {
        if (err) throw err;
    });
};

const getContractsDeployedPath = () => {
    const result = path.join(twoKeyProtocolDir,'contracts_deployed{branch}.json');
    if(contractsStatus && contractsStatus.current) {
        return result.replace('{branch}',`-${contractsStatus.current}`);
    }
    return result;
};

const getContractsDeployedDistPath = () => {
    const result = path.join(twoKeyProtocolDist,'contracts_deployed{branch}.json');
    if(contractsStatus && contractsStatus.current) {
        return result.replace('{branch}',`-${contractsStatus.current}`);
    }
    return result;
};

const getVersionsPath = (branch = true) => {
    const result = path.join(twoKeyProtocolDir,'versions{branch}.json');
    if (branch) {
        if(contractsStatus && contractsStatus.current) {
            return result.replace('{branch}',`-${contractsStatus.current}`);
        }
        return result;
    }
    return result.replace('{branch}', '');
};


const archiveBuild = () => tar.c({ gzip: true, file: getBuildArchPath(), cwd: __dirname }, ['build']);

const restoreFromArchive = () => {
    console.log("restore",__dirname);
    // Restore file only if exists
    if(fs.existsSync(getBuildArchPath())) {
        return tar.x({file: getBuildArchPath(), gzip: true, cwd: __dirname});
    }
};

const generateSOLInterface = () => new Promise((resolve, reject) => {
    console.log('Generating abi', deployedTo);
    if (fs.existsSync(buildPath)) {
        let contracts = {
            'contracts': {},
        };

        let singletonAddresses = [];
        const proxyFile = path.join(buildPath, 'proxyAddresses.json');
        let json = {};
        let data = {};
        let proxyAddresses = {};
        if (fs.existsSync(proxyFile)) {
            proxyAddresses = JSON.parse(fs.readFileSync(proxyFile, { encoding: 'utf-8' }));
        }
        readdir(contractsBuildPath).then((files) => {
            try {
                files.forEach((file) => {
                    const {
                        networks, contractName, bytecode, abi
                    } = JSON.parse(fs.readFileSync(path.join(contractsBuildPath, file), { encoding: 'utf-8' }));
                    if (whitelist[contractName]) {
                        const whiteListedContract = whitelist[contractName];
                        const proxyNetworks = proxyAddresses[contractName] || {};
                        const mergedNetworks = {};
                        Object.keys(networks).forEach(key => {
                            mergedNetworks[key] = { ...networks[key], ...proxyNetworks[key] };
                            if(proxyNetworks[key]) {
                                singletonAddresses.push(proxyNetworks[key].address);
                                singletonAddresses.push(proxyNetworks[key].implementationAddressStorage);
                            }
                        });
                        if (!contracts.contracts[whiteListedContract.file]) {
                            contracts.contracts[whiteListedContract.file] = {};
                        }
                        contracts.contracts[whiteListedContract.file][contractName] = { abi, name: contractName };
                        if (whiteListedContract.networks) {
                            contracts.contracts[whiteListedContract.file][contractName].networks = mergedNetworks;
                        }
                        if (whiteListedContract.bytecode) {
                            contracts.contracts[whiteListedContract.file][contractName].bytecode = bytecode;
                        }

                        json[contractName] = whitelist[contractName].singleton
                            ? {networks: mergedNetworks, abi, name: contractName} : {bytecode, abi, name: contractName};

                        let networkKeys = Object.keys(networks);
                        networkKeys.forEach((key) => {
                            if (Array.isArray(data[key.toString()])) {
                                data[key.toString()].push({
                                    contract : contractName,
                                    address : networks[key].address});
                            } else {
                                data[key.toString()] = [{
                                    contract : contractName,
                                    address : networks[key].address}];
                            }
                        });
                    }
                });
                const nonSingletonsBytecodes = [];
                Object.keys(contracts.contracts).forEach(submodule => {
                    if (submodule !== 'singletons') {
                        console.log('-------------------------');
                        console.log('SUBMODULE IS: ', submodule)
                        Object.values(contracts.contracts[submodule]).forEach(({ bytecode, abi }) => {
                            nonSingletonsBytecodes.push(bytecode || JSON.stringify(abi));
                        });
                    }
                });
                const nonSingletonsHash = sha256(nonSingletonsBytecodes.join(''));
                const singletonsHash = sha256(singletonAddresses.join(''));
                Object.keys(contracts.contracts).forEach(key => {
                    contracts.contracts[key]['NonSingletonsHash'] = nonSingletonsHash;
                    contracts.contracts[key]['SingletonsHash'] = singletonsHash;
                });

                let obj = {
                    'NonSingletonsHash': nonSingletonsHash,
                    'SingletonsHash': singletonsHash,
                };


                contracts.contracts.singletons = Object.assign(obj, contracts.contracts.singletons);
                console.log('Writing contracts for submodules...');
                if(!fs.existsSync(path.join(twoKeyProtocolDir, 'contracts'))) {
                    fs.mkdirSync(path.join(twoKeyProtocolDir, 'contracts'));
                }
                Object.keys(contracts.contracts).forEach(file => {
                    fs.writeFileSync(path.join(twoKeyProtocolDir, 'contracts', `${file}.ts`), `export default ${util.inspect(contracts.contracts[file], {depth: 10})}`)
                });
                json = Object.assign(obj,json);
                fs.writeFileSync(getContractsDeployedPath(), JSON.stringify(json, null, 2));
                if (deployment) {
                    fs.copyFileSync(getContractsDeployedPath(),getContractsDeployedDistPath());
                }
                resolve(contracts);
            } catch (err) {
                reject(err);
            }
        });
    }
});


const updateIPFSHashes = async(contracts) => {
    const nonSingletonHash = contracts.contracts.singletons.NonSingletonsHash;
    console.log(nonSingletonHash);


    let versionsList = {};

    let existingVersionHandlerFile = {};

    // if(!process.argv.includes('--reset')) {
    try {
        existingVersionHandlerFile = JSON.parse(fs.readFileSync(getVersionsPath()), { encoding: 'utf8' });
        console.log('EXISTING VERSIONS', existingVersionHandlerFile);
    } catch (e) {
        console.log('VERSIONS ERROR', e);
    }

    const { TwoKeyVersionHandler: currentVersionHandler } = existingVersionHandlerFile;

    if (currentVersionHandler) {
        versionsList = JSON.parse((await ipfsGet(currentVersionHandler)).toString());
        console.log('VERSION LIST', versionsList);
    }
    // }

    versionsList[nonSingletonHash] = {};
    const files = (await readdir(twoKeyProtocolSubmodulesDir)).filter(file => file.endsWith('.js'));
    for (let i = 0, l = files.length; i < l; i++) {
        const js = fs.readFileSync(path.join(twoKeyProtocolSubmodulesDir, files[i]), { encoding: 'utf-8' });
        console.log(files[i], (js.length / 1024).toFixed(3));
        console.time('Upload');
        const [{ hash }] = await ipfsAdd(js, deployment);
        console.timeEnd('Upload');
        console.log('ipfs hashes',files[i], hash);
        versionsList[nonSingletonHash][files[i].replace('.js', '')] = hash;
    }
    console.log(versionsList);
    const [{ hash: newTwoKeyVersionHandler }] = await ipfsAdd(JSON.stringify(versionsList), deployment);
    fs.writeFileSync(getVersionsPath(), JSON.stringify({ TwoKeyVersionHandler: newTwoKeyVersionHandler }, null, 4));
    fs.writeFileSync(getVersionsPath(false), JSON.stringify({ TwoKeyVersionHandler: newTwoKeyVersionHandler }, null, 4));
    console.log('TwoKeyVersionHandler', newTwoKeyVersionHandler);
};

/**
 *
 * @param commitMessage
 * @returns {Promise<void>}
 */
const commitAndPushContractsFolder = async(commitMessage) => {
    const contractsStatus = await contractsGit.status();
    await contractsGit.add(contractsStatus.files.map(item => item.path));
    await contractsGit.commit(commitMessage);
    await contractsGit.push('origin', contractsStatus.current);
};

/**
 *
 * @param commitMessage
 * @returns {Promise<void>}
 */
const commitAndPush2KeyProtocolSrc = async(commitMessage) => {
    const status = await twoKeyProtocolSrcGit.status();
    await twoKeyProtocolSrcGit.add(status.files.map(item => item.path));
    await twoKeyProtocolSrcGit.commit(commitMessage);
    await twoKeyProtocolSrcGit.push('origin', status.current);
};

/**
 *
 * @param commitMessage
 * @returns {Promise<void>}
 */
const commitAndPush2keyProtocolLibGit = async(commitMessage) => {
    const status = await twoKeyProtocolLibGit.status();
    await twoKeyProtocolLibGit.add(status.files.map(item => item.path));
    await twoKeyProtocolLibGit.commit(commitMessage);
    await twoKeyProtocolLibGit.push('origin', status.current);
};

/**
 *
 * @type {function(*)}
 */
const pushTagsToGithub = (async (npmVersionTag) => {
    await contractsGit.addTag('v'+npmVersionTag.toString());
    await contractsGit.pushTags('origin');

    await twoKeyProtocolLibGit.pushTags('origin');

    await twoKeyProtocolSrcGit.addTag('v'+npmVersionTag.toString());
    await twoKeyProtocolSrcGit.pushTags('origin');
});


const checkIfContractIsPlasma = (contractName) => {
    return !!contractName.includes('Plasma');

};

const getContractsFromFile = () => {
    let file = JSON.parse(fs.readFileSync('./scripts/deployments/manualDeploy.json', 'utf8'));
    return file;
};

/**
 *  TODO: Improve and change this script to handle following by hierarchy:
 *  - if deployment is protocol only or there're contracts to be deployed.
 *  - if protocol deployment, skip whole contracts process, and proceed to submodule generation
 *  - if contracts deployment, check if we're deploying contracts by getting diff between latest tags,
 *  - or we're deplpoying them by specifying in file which contracts we want to deploy
 *
 *  TODO: Improvement for fetching contracts to be deployed:
 *  - if singletons, we need list of contracts
 *  - if campaign contracts, we only need flag with campaign type and if it has to be deployed
 *
 */


async function deployUpgrade(networks) {
    console.log(networks);
    const l = networks.length;

    await runTruffleCompile();

    let deployment = {};


    if(process.argv.includes('deploy-from-file')) {
        let contracts = getContractsFromFile();
        deployment.singletons = contracts.singletons;
        deployment.tokenSell = contracts.tokenSell;
        deployment.donation = contracts.donation;
        deployment.ppc = contracts.cpc;
        deployment.cpcNoRewards = contracts.cpcNoRewards;
    } else {
        [
            deployment.singletons,
            deployment.tokenSell,
            deployment.donation,
            deployment.ppc,
            deployment.cpcNoRewards
        ] = await getDiffBetweenLatestTags();
    }

    console.log(deployment);

    for (let i = 0; i < l; i += 1) {
        /* eslint-disable no-await-in-loop */

        // Deploy the CPC contracts
        if(process.argv.includes('cpc-no-fees-deploy')) {
            console.log("Deploying 2 new singleton contracts for budget campaigns payments handlers");
            await runDeployPaymentHandlersMigration(networks[i]);
        }

        if(deployment.singletons.length > 0) {
            for(let j=0; j<deployment.singletons.length; j++) {
                /* eslint-disable no-await-in-loop */
                console.log(networks[i], deployment.singletons[j]);
                if(checkIfContractIsPlasma(deployment.singletons[j])) {
                    console.log('Contract is plasma: ' + deployment.singletons[j]);
                    if(networks[i].includes('private') || networks[i].includes('plasma')) {
                        await runUpdateMigration(networks[i], deployment.singletons[j]);
                    }
                } else {
                    if(networks[i].includes('public')) {
                        await runUpdateMigration(networks[i], deployment.singletons[j]);
                    }
                }
            }
        }

        if(deployment.tokenSell) {
            if(networks[i].includes('public')) {
                await runDeployTokenSellCampaignMigration(networks[i]);
            }
        }

        if(deployment.donation) {
            if(networks[i].includes('public')) {
                await runDeployDonationCampaignMigration(networks[i]);
            }
        }

        if(deployment.ppc) {
            await runDeployCPCCampaignMigration(networks[i]);
        }

        if(deployment.cpcNoRewards) {
            await runDeployCPCNoRewardsMigration(networks[i]);
        }

        /* eslint-enable no-await-in-loop */
    }
    await archiveBuild();
}

async function deploy() {
    try {
        deployment = true;
        console.log("Removing truffle build, the whole folder will be deleted: ", buildPath);
        await rmDir(buildPath);
        await pullTenderlyConfiguration();
        await contractsGit.fetch();
        await contractsGit.submoduleUpdate();
        let twoKeyProtocolStatus = await twoKeyProtocolLibGit.status();
        if (twoKeyProtocolStatus.current !== contractsStatus.current) {
            const twoKeyProtocolBranches = await twoKeyProtocolLibGit.branch();
            if (twoKeyProtocolBranches.all.find(item => item.includes(contractsStatus.current))) {
                await twoKeyProtocolLibGit.checkout(contractsStatus.current);
            } else {
                await twoKeyProtocolLibGit.checkoutLocalBranch(contractsStatus.current);
            }
        }
        await contractsGit.submoduleUpdate();
        await twoKeyProtocolLibGit.reset('hard');
        const localChanges = contractsStatus.files.filter(item => !(item.path.includes('dist') || item.path.includes('contracts.ts') || item.path.includes('contracts_deployed')
            || (process.env.NODE_ENV === 'development' && item.path.includes(process.argv[1].split('/').pop()))));
        if (contractsStatus.behind || localChanges.length) {
            console.log('You have unsynced changes!', localChanges);
            process.exit(1);
        }
        console.log(process.argv);

        const local = process.argv[2].includes('local'); //If we're deploying to local network

        const isHardReset = process.argv.includes('--reset');

        //If reset rm -rf build folder and rm -rf tar.gz
        if(isHardReset) {
            await rmDir(buildPath);
            await rmDir(buildArchPath);
        } else {
            await restoreFromArchive();
        }


        const networks = process.argv[2].split(',');
        const network = networks.join('/');
        const now = moment();
        const commit = `SOL Deployed to ${network} ${now.format('lll')}`;

        if(!process.argv.includes('protocol-only')) {
            if(process.argv.includes('update')) {
                await deployUpgrade(networks);
            }
            if(process.argv.includes('--reset')) {
                await deployContracts(networks, true);
            }
        }

        await archiveBuild();
        const contracts = await generateSOLInterface();

        await commitAndPushContractsFolder(`Contracts deployed to ${network} ${now.format('lll')}`);
        await commitAndPush2KeyProtocolSrc(`Contracts deployed to ${network} ${now.format('lll')}`);
        console.log('Changes commited');
        await buildSubmodules(contracts);
        if (!local) {
            await runProcess(path.join(__dirname, 'node_modules/.bin/webpack'));
        }
        contractsStatus = await contractsGit.status();
        await commitAndPushContractsFolder(commit);
        await commitAndPush2KeyProtocolSrc(commit);
        await commitAndPush2keyProtocolLibGit(commit);
        /**
         * Npm patch & public
         * Get version of package
         * put the tag
         */
        if(!local || process.env.FORCE_NPM) {
            process.chdir(twoKeyProtocolDist);
            const oldVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
            if (process.env.NODE_ENV === 'production') {
                await runProcess('npm', ['version', 'patch']);
            } else {
                const { version } = JSON.parse(fs.readFileSync(path.join(twoKeyProtocolDist, 'package.json'), 'utf8'));
                const versionArray = version.split('-')[0].split('.');
                let patch;
                let minor;
                if(isHardReset) {
                    //Take the last one, that's patch
                    versionArray.pop();
                    // Reset it to be 0
                    patch = 0;
                    //Take the middle version and increment by 1
                    minor = parseInt(versionArray.pop(), 10) + 1;
                    //Push minor
                    versionArray.push(minor);
                    //Push new patch
                    versionArray.push(patch);
                } else {
                    // In case this is just a patch, increment patch number
                    patch = parseInt(versionArray.pop(), 10) + 1;

                    // Push new patch
                    versionArray.push(patch);
                }
                const newVersion = `${versionArray.join('.')}-${contractsStatus.current}`;
                await runProcess('npm', ['version', newVersion])
            }
            const json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            let npmVersionTag = json.version;
            console.log(npmVersionTag);
            process.chdir('../../');
            // Push tags
            await pushTagsToGithub(npmVersionTag);

            process.chdir(twoKeyProtocolDist);
            if (process.env.NODE_ENV === 'production' || contractsStatus.current === 'master') {
                await runProcess('npm', ['publish']);
            } else {
                await runProcess('npm', ['publish', '--tag', contractsStatus.current]);
            }
            await twoKeyProtocolLibGit.push('origin', contractsStatus.current);
            process.chdir('../../');
            //Run slack message
            await slack_message('v'+npmVersionTag.toString(), 'v'+oldVersion.toString(), branch_to_env[contractsStatus.current]);
            if(!process.argv.includes('protocol-only')) {
                // Add tenderly to CI/CD only in case there have been contracts updated.
                await runProcess('tenderly', ['push', '--tag', npmVersionTag]);
            }
            // Generate the latest changelog for contracts repo
            await generateChangelog();
            // Go to 2key-protocol/src
            process.chdir(twoKeyProtocolDir);
            // Generate the changelog for this repository
            await generateChangelog();

            // Push final commit for the deployment
            await commitAndPush2KeyProtocolSrc(`Version: ${npmVersionTag}. Deployment finished, changelog generated, submodules synced.`);
            await commitAndPushContractsFolder(`Version: ${npmVersionTag}. Deployment finished, changelog generated, submodules synced.`);
        } else {
            process.exit(0);
        }
    } catch (e) {
        if (e.output) {
            e.output.forEach((buff) => {
                if (buff && buff.toString) {
                    console.log(buff.toString('utf8'));
                }
            });
        } else {
            console.warn('Error', e);
        }
        await contractsGit.reset('hard');
    }
}

const test = () => new Promise(async (resolve, reject) => {
    try {
        await runProcess('node', ['-r', 'dotenv/config', './node_modules/.bin/mocha', '--exit', '--bail', '-r', 'ts-node/register', '2key-protocol/test/index.spec.ts']);
        resolve();
    } catch (err) {
        reject(err);
    }

});

const buildSubmodules = async(contracts) => {
    await runProcess(path.join(__dirname, 'node_modules/.bin/webpack'), ['--config', './webpack.config.submodules.js', '--mode production', '--colors']);
    await updateIPFSHashes(contracts);
};

const getMigrationsList = () => {
    const migrationDir = path.join(__dirname, 'migrations');
    return fs.readdirSync(migrationDir);
};

const runMigration = async (index, network, updateArchive) => {
    await runProcess(
        path.join(__dirname, 'node_modules/.bin/truffle'),
        ['migrate', '--f', index, '--to', index, '--network', network].concat(process.argv.slice(4))
    );
    if (updateArchive) {
        await archiveBuild();
        let deploy = {};
        try {
            deploy = JSON.parse(fs.readFileSync(path.join(__dirname, 'deploy.json'), { encoding: 'utf-8' }))
        } catch (e) {
        }
        deploy[network] = index;
        fs.writeFileSync(path.join(__dirname, 'deploy.json'), JSON.stringify(deploy), { encoding: 'utf-8' });
        await restoreFromArchive();
    }
};

const getStartMigration = (network) => {
    let deploy = {};
    if (process.argv.includes('--reset')) {
        return 1;
    }
    try {
        deploy = JSON.parse(fs.readFileSync(path.join(__dirname, 'deploy.json'), { encoding: 'utf-8' }))
    } catch (e) {
    }
    return deploy[network] ? deploy[network] + 1 :  1;
};

const deployContracts = async (networks, updateArchive) => {
    const l = networks.length;
    for (let i = 0; i < l; i += 1) {
        for (let j = getStartMigration(networks[i]), m = getMigrationsList().length; j <= m; j += 1) {
            /* eslint-disable no-await-in-loop */
            await runMigration(j, networks[i], updateArchive);
            /* eslint-enable no-await-in-loop */
        }
        deployedTo[truffleNetworks[networks[i]].network_id.toString()] = truffleNetworks[networks[i]].network_id;
    }
};


async function main() {
    contractsStatus = await contractsGit.status(); // Fetching branch
    const mode = process.argv[2];
    switch (mode) {
        case '--migrate':
            try {
                const networks = process.argv[3].split(',');
                await deployContracts(networks, false);
                await generateSOLInterface();
                process.exit(0);
            } catch (err) {
                process.exit(1);
            }
            break;
        case '--generate':
            await generateSOLInterface();
            process.exit(0);
            break;
        case '--archive':
            await archiveBuild();
            process.exit(0);
            break;
        case '--extract':
            await restoreFromArchive();
            process.exit(0);
            break;
        case '--submodules':
            const contracts = await generateSOLInterface();
            await buildSubmodules(contracts);
            process.exit(0);
            break;
        case '--diff':
            console.log(await getDiffBetweenLatestTags());
            process.exit(0);

        case '--tenderly':
            await pullTenderlyConfiguration();
            process.exit(0);
        case '--readFile':
            console.log(getContractsFromFile());
            process.exit(0);
        default:
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise(resolve => {
                rl.question("This will start deployment process. Proceed? [Y/N] ", answer => resolve(answer))
            })
            rl.close();
            if(answer.toUpperCase() === 'N' || answer.toUpperCase() === 'NO') {
                process.exit(0);
            }

            await deploy();
            process.exit(0);
    }
}



main().catch((e) => {
    console.log(e);
    process.exit(1);
});
