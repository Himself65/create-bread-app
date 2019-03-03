const path = require('path')
const fs = require('fs-extra')
const debug = require('debug')('bread-script')
const spawn = require('cross-spawn')
const validateProjectName = require('validate-npm-package-name')
const commander = require('commander')
const chalk = require('chalk').default

const packageJson = require('../package.json')

let projectName = null

// todo
const command = new commander.Command(packageJson.name)
  .version(packageJson.version)
  .arguments('<project-directory>')
  .action(name => {
    projectName = name
  })
  .option('--useWebpack, -webpack')
  .option('--useRollup, -rollup')
  .option('--useTypeScript, -ts')
  .option('--use-npm, -npm')
  .option('--use-yarn, -yarn')
  .allowUnknownOption()
  .on('--help', () => {
    console.log(`    Only ${chalk.green('<project-directory>')} is required.`)
    console.log()
  })
  .parse(process.argv)

debug(
  'commands',
  command.useWebpack,
  command.useRollup,
  command.useTypeScript,
  command.useNpm,
  command.useYarn
)

createApp(projectName,
  command.useWebpack,
  command.useRollup,
  command.useTypeScript,
  command.useNpm,
  command.useYarn
)

// based on creat-react-app
// todo
function createApp (
  name,
  useWebpack = false,
  useRollup = true,
  typeScript = true,
  useNpm = false,
  useYarn = true
) {
  const root = path.resolve(__dirname, name)
  const appName = path.basename(root)
  checkAppName(appName)
  fs.ensureDirSync(name)

  const packageJson = {
    name: appName,
    version: '0.1.0',
    private: true,
    files: []
  }

  const allDependencies = {
    dev: [
      '@types/node',
      '@types/jest',
      '@babel/core',
      '@babel/preset-env'
    ],
    prod: [
      'cross-env'
    ]
  }

  packageJson.files.concat([
    'babel.config.js',
    'jest.config.js'
  ])
  if (typeScript) {
    allDependencies.dev.concat([
      'typescript',
      'tslint'
    ])
    packageJson.files.concat([
      'tslint.json',
      'tsconfig.json'
    ])
  }
  const rollupDependencies = [
    'rollup',
    'rollup-plugin-node-resolve',
    'rollup-plugin-commonjs',
    'rollup-plugin-json',
    'rollup-plugin-terser',
    typeScript && 'rollup-plugin-typescript'
  ]

  const webpackDependencies = [
    'webpack',
    'webpack-cli',
    'webpack-chain',
    'babel-loader',
    typeScript && 'ts-loader'
  ]

  if (useRollup) {
    allDependencies.dev.concat(rollupDependencies)
    packageJson.files.concat(['build/webpack'])
  }
  if (useWebpack) {
    allDependencies.dev.concat(webpackDependencies)
    packageJson.files.concat(['build/rollup'])
  }

  run(name, packageJson, allDependencies, useNpm, useYarn)
}

function run (name, packageJson, allDependencies, useNpm, useYarn) {
  install(
    path,
    allDependencies,
    useNpm,
    useYarn
  )
    .then(message => {
      console.log(chalk.green(message))
    })
    .catch(message => {
      console.log(chalk.red(message))
    })
}

function install (path, allDependencies, useNpm, useYarn) {
  // todo
  let command
  let installCommand
  let devCommand
  if (useYarn) {
    command = 'yarn'
    installCommand = 'add'
    devCommand = '--dev'
  } else if (useNpm) {
    command = 'npm'
    installCommand = 'install'
    devCommand = '--save-dev'
  }
  const _ = (args, arr) => {
    return new Promise((resolve, reject) => {
      const child = spawn(command, [].concat(args).concat(arr), { stdio: 'inherit' })
      child.on('close', code => {
        if (code !== 0) {
          reject(
            new Error(`${command} ${args.join(' ')}`)
          )
          return
        }
        resolve()
      })
    })
  }
  return Promise.all(
    _([installCommand], allDependencies.prod),
    _([installCommand, devCommand], allDependencies.dev)
  )
}

function printValidationResults (results) {
  if (typeof results !== 'undefined') {
    results.forEach(error => {
      console.error(chalk.red(`  *  ${error}`))
    })
  }
}

function checkAppName (appName) {
  const validationResult = validateProjectName(appName)
  if (!validationResult.validForNewPackages) {
    console.error(
      `Could not create a project called ${chalk.red(
        `"${appName}"`
      )} because of npm naming restrictions:`
    )
    printValidationResults(validationResult.errors)
    printValidationResults(validationResult.warnings)
    process.exit(1)
  }
}