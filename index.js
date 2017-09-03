const { Robot, Constants, Interfaces } = require('ftl-robot-host');
const { StandardProtocols } = require('ftl-comms');
const winston = require('winston');
const commandLineArgs = require('command-line-args');

const tsFormat = () => (new Date()).toLocaleTimeString();
const logger = new (winston.Logger)({
    filters: [
        (level, msg, meta) => {
            return '[ftl-lab-robot] ' + msg;
        }
    ],
    transports: [
        // colorize the output to the console
        new (winston.transports.Console)({
        timestamp: tsFormat,
        colorize: true,
        })
    ]
});

const optionDefs = [
    { name: 'connection', alias: 'c', type: String, defaultOption: true },
    { name: 'port', alias: 'p', type: Number},
    { name: 'robotConfig', alias: 'r', type: String}
];

const opts = commandLineArgs(optionDefs, { partial: true });

const DEFAULT_PROTOCOL = 'simple';
const DEFAULT_ROBOT_CONFIG = 'basic';

const cfgProtocol = opts.connection !== undefined ? opts.connection : DEFAULT_PROTOCOL;
const cfgRobotConfig = opts.robotConfig !== undefined ? opts.robotConfig : DEFAULT_ROBOT_CONFIG;

logger.info('=== Starting FTL Lab Robot ===');
logger.info('Protocol: ', cfgProtocol);
logger.info('Robot Config: ', cfgRobotConfig);

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

if (!ftlCommProto) {
    logger.error('Could not load communications protocol. Exiting');
    process.exit(1);
}

ftlCommProto.start();

// Pick our configuration
// Look in the configuation folder
var configReqStr = './configurations/' + cfgRobotConfig;
var robotConfiguration;
// try the built in one first
try {
    robotConfiguration = require(configReqStr);
}
catch(e) {
    logger.warn('Could not load built in robot configuration. Trying external. Error: ', e);
    // Otherwise, try loading it as a module by itself
    try {
        robotConfiguration = require(cfgRobotConfig);
    }
    catch (e) {
        logger.error('Could not load external robot configuration. Exiting. Error: ', e);
        process.exit(1);
    }
}

if (cfgRobotConfig === 'interactive-debug') {
    const AstarBoardDisplay = require('ftl-mocks').AstarBoard;
    var i2c = robotConfiguration.interfaces[0].implementation;
    var boardDisplay = new AstarBoardDisplay(i2c, 6566);
    logger.info('Using interactive debug mode');
}

var ftlRobot = new Robot(robotConfiguration);

// Hook up the events between protocol and robot
// Events from the protocol = act on robot outputs
ftlCommProto.on('digitalOutput', (port, val) => {
    ftlRobot.writeDigital(port, val);
});

ftlCommProto.on('analogOutput', (port, val) => {
    // TODO Implement
});

ftlCommProto.on('pwmOutput', (port, val) => {
    ftlRobot.writePWM(port, val);
});

ftlCommProto.on('robotCommand', (command) => {
    // TODO Implement
});

ftlCommProto.on('systemMessage', (type, msg) => {
    logger.info('SYS: (' + type + ') ' + msg);
});

ftlCommProto.on('enableRobot', () => {
    logger.info('Robot ENABLED');
    ftlRobot.enable();
});

ftlCommProto.on('disableRobot', () => {
    logger.info('Robot DISABLED');
    ftlRobot.disable();
});

// Events from robot = provide robot input values to client
// Or, in our case, we set up timers to read data, and when there is 
// a change, send an update back
var digitalPorts = [],
    analogPorts = [];

for (var portId in robotConfiguration.portMap) {
    var idParts = portId.split('-');
    if (idParts[0] === 'D') {
        digitalPorts.push(parseInt(idParts[1], 10));
    }
    else if (idParts[0] === 'A') {
        analogPorts.push(parseInt(idParts[1], 10));
    }
}

var inputState = {
    digital: {},
    analog: {},
}

var readIntervalToken = setInterval(() => {
    // Get each port
    digitalPorts.forEach((portNum) => {
        var val = ftlRobot.readDigital(portNum);
        if (inputState.digital[portNum] !== val) {
            inputState.digital[portNum] = val;
            ftlCommProto.setDigitalInput(portNum, val);
        }
    });

    analogPorts.forEach((portNum) => {
        var val = ftlRobot.readAnalog(portNum);
        if (inputState.analog[portNum] !== val) {
            inputState.analog[portNum] = val;
            ftlCommProto.setAnalogInput(portNum, val);
        }
    });
}, 100);