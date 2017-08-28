const { Robot, Constants, Interfaces } = require('ftl-robot-host');
const { StandardProtocols } = require('ftl-comms');
const logger = require('winston');
const commandLineArgs = require('command-line-args');

const optionDefs = [
    { name: 'mock', alias: 'm', type: Boolean },
    { name: 'connection', alias: 'c', type: String, defaultOption: true },
    { name: 'port', alias: 'p', type: Number},
    { name: 'robotConfig', alias: 'r', type: String}
];

const opts = commandLineArgs(optionDefs, { partial: true });

const DEFAULT_PROTOCOL = 'simple';
const DEFAULT_ROBOT_CONFIG = 'basic';

const cfgUseMocks = !!opts.mock;
const cfgProtocol = opts.connection !== undefined ? opts.connection : DEFAULT_PROTOCOL;
const cfgRobotConfig = opts.robotConfig !== undefined ? opts.robotConfig : DEFAULT_ROBOT_CONFIG;

var ftlCommProto;
switch (cfgProtocol) {
    case 'simple': {
        var simplePort;
        if (opts.port !== undefined) {
            simplePort = opts.port;
        }
        ftlCommProto = new StandardProtocols.FTLSimpleProtocol(simplePort);
    } break;
    // Add any other types of protocols that we can handle here
}

// Pick our configuration
// Look in the configuation folder
var configReqStr = './configurations/' + cfgRobotConfig;
var robotConfiguration;
// try the built in one first
try {
    robotConfiguration = require(configReqStr);
}
catch(e) {
    console.log('Could not load built in robot configuration. Trying external');
    // Otherwise, try loading it as a module by itself
    try {
        robotConfiguration = require(cfgRobotConfig);
    }
    catch (e) {
        console.log('Could not load external robot configuration. Bailing out');
        process.exit(1);
    }
}

var ftlRobot = new Robot(robotConfiguration);

// Hook up the events between protocol and robot
// Events from the protocol = act on robot outputs
ftlCommProto.on('digitalOutput', (port, val) => {

});

ftlCommProto.on('analogOutput', (port, val) => {

});

ftlCommProto.on('pwmOutput', (port, val) => {

});

ftlCommProto.on('robotCommand', (command) => {

});

ftlCommProto.on('systemMessage', (type, msg) => {

});

ftlCommProto.on('enableRobot', () => {

});

ftlCommProto.on('disableRobot', () => {

});

// Events from robot = provide robot input values to client
// Or, in our case, we set up timers to read data, and when there is 
// a change, send an update back
