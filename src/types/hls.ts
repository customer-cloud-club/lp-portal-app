/**
 * HLS related type definitions
 */
export interface HLSConfig {
  autoStartLoad?: boolean;
  startPosition?: number;
  debug?: boolean;
  enableWorker?: boolean;
  lowLatencyMode?: boolean;
  backBufferLength?: number;
}

export interface HLSEventData {
  type: string;
  details: string;
  fatal?: boolean;
  error?: Error;
  frag?: any;
  response?: any;
}

export interface HLSEvents {
  MANIFEST_PARSED: 'hlsManifestParsed';
  LEVEL_LOADED: 'hlsLevelLoaded';
  FRAG_LOADED: 'hlsFragLoaded';
  ERROR: 'hlsError';
}

export interface VideoQualityLevel {
  height: number;
  width: number;
  bitrate: number;
  name: string;
  index: number;
}
