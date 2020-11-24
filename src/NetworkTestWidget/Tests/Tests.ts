import { testMediaConnectionBitrate, MediaConnectionBitrateTest } from '@twilio/rtc-diagnostics';
import { Device, Connection, PreflightTest } from 'twilio-client';
import { getLogger } from 'loglevel';
import { name as appName } from '../../../package.json';
import { regionalizeIceUrls } from '../../utils';
import { Edge } from '../../types';
import RTCSample from 'twilio-client/es5/twilio/rtc/sample';

const log = getLogger(appName);
const level = process.env.NODE_ENV === 'development' ? 'debug' : 'error';

log.setLevel(level, false);
// Set the log level for client js
getLogger(Device.packageName).setLevel(level, false);

const preflightOptions: PreflightTest.Options = {
  debug: false,
  signalingTimeoutMs: 10000,
  fakeMicInput: true,
};

export const BITRATE_TEST_DURATION = 15000;

export function preflightTestRunner(
  edge: Edge,
  token: string,
  iceServers: RTCIceServer[],
  codecPreferences: Connection.Codec[]
) {
  const updatedIceServers = regionalizeIceUrls(edge, iceServers);

  return new Promise<PreflightTest.Report>((resolve, reject) => {
    const preflightTest = Device.runPreflight(token, {
      ...preflightOptions,
      edge: edge,
      iceServers: updatedIceServers,
      codecPreferences,
    });
    let hasConnected = false;
    let latestSample: RTCSample;

    preflightTest.on(PreflightTest.Events.Completed, (report: PreflightTest.Report) => {
      log.debug('Preflight Test - report: ', report);
      resolve(report);
    });

    preflightTest.on(PreflightTest.Events.Connected, () => {
      log.debug('Preflight Test - connected');
      hasConnected = true;
    });

    preflightTest.on(PreflightTest.Events.Sample, (sample: RTCSample) => {
      latestSample = sample;
    });

    preflightTest.on(PreflightTest.Events.Failed, (error) => {
      log.debug('Preflight Test - failed: ', error);
      error.hasConnected = hasConnected;
      error.latestSample = latestSample;
      reject(error);
    });

    preflightTest.on(PreflightTest.Events.Warning, (warningName, warningData) => {
      log.debug('Preflight Test - warning: ', warningName, warningData);
    });
  });
}

export function bitrateTestRunner(edge: Edge, iceServers: MediaConnectionBitrateTest.Options['iceServers']) {
  const updatedIceServers = regionalizeIceUrls(edge, iceServers);

  return new Promise<MediaConnectionBitrateTest.Report>((resolve, reject) => {
    const bitrateTest = testMediaConnectionBitrate({ iceServers: updatedIceServers });

    bitrateTest.on(MediaConnectionBitrateTest.Events.Bitrate, (bitrate) => {
      log.debug('Bitrate Test - bitrate: ', bitrate);
    });

    bitrateTest.on(MediaConnectionBitrateTest.Events.Error, (error) => {
      log.debug('Bitrate Test - error: ', error);
      reject(error);
    });

    bitrateTest.on(MediaConnectionBitrateTest.Events.End, (report) => {
      log.debug('Bitrate Test - end: ', report);
      resolve(report);
    });

    setTimeout(() => {
      bitrateTest.stop();
    }, BITRATE_TEST_DURATION);
  });
}
