import { InsuranceAdapter } from './adapter';
import { InsuranceAdapterConfig } from './types';
import { MockInsuranceAdapter } from './adapters/mock-adapter';
import { ASSAInsuranceAdapter } from './adapters/assa-adapter';
import { ConnectInsuranceAdapter } from './adapters/connect-adapter';
import { logSystem as logger } from '../../logger';

export type InsurerCode = 'MOCK' | 'ASSA' | 'CONNECT';

const adapterRegistry: Map<InsurerCode, InsuranceAdapter> = new Map();

const adapterConfigs: Map<InsurerCode, InsuranceAdapterConfig> = new Map();

function createAdapter(code: InsurerCode): InsuranceAdapter {
  switch (code) {
    case 'MOCK':
      return new MockInsuranceAdapter();
    case 'ASSA':
      return new ASSAInsuranceAdapter();
    case 'CONNECT':
      return new ConnectInsuranceAdapter();
    default:
      throw new Error(`Unknown insurer code: ${code}`);
  }
}

export function getInsuranceAdapter(code: InsurerCode): InsuranceAdapter {
  let adapter = adapterRegistry.get(code);
  
  if (!adapter) {
    adapter = createAdapter(code);
    const config = adapterConfigs.get(code);
    if (config) {
      adapter.configure(config);
    }
    adapterRegistry.set(code, adapter);
    logger.info(`Insurance adapter created: ${code}`);
  }
  
  return adapter;
}

export function configureAdapter(code: InsurerCode, config: InsuranceAdapterConfig): void {
  adapterConfigs.set(code, config);
  
  const existingAdapter = adapterRegistry.get(code);
  if (existingAdapter) {
    existingAdapter.configure(config);
    logger.info(`Insurance adapter reconfigured: ${code}`);
  }
}

export function getAllAdapters(): InsuranceAdapter[] {
  const codes: InsurerCode[] = ['MOCK', 'ASSA', 'CONNECT'];
  return codes.map(code => getInsuranceAdapter(code));
}

export function getConfiguredAdapters(): InsuranceAdapter[] {
  const adapters: InsuranceAdapter[] = [];
  
  if (process.env.ASSA_API_URL && process.env.ASSA_API_KEY) {
    const assa = getInsuranceAdapter('ASSA');
    assa.configure({
      apiBaseUrl: process.env.ASSA_API_URL,
      apiKey: process.env.ASSA_API_KEY,
      apiSecret: process.env.ASSA_API_SECRET,
    });
    adapters.push(assa);
  }
  
  if (process.env.CONNECT_API_URL && process.env.CONNECT_API_KEY) {
    const connect = getInsuranceAdapter('CONNECT');
    connect.configure({
      apiBaseUrl: process.env.CONNECT_API_URL,
      apiKey: process.env.CONNECT_API_KEY,
      apiSecret: process.env.CONNECT_API_SECRET,
    });
    adapters.push(connect);
  }
  
  if (adapters.length === 0 || process.env.NODE_ENV === 'development') {
    adapters.push(getInsuranceAdapter('MOCK'));
  }
  
  return adapters;
}

export function getSupportedInsurers(): Array<{ code: InsurerCode; name: string; configured: boolean }> {
  return [
    { 
      code: 'ASSA', 
      name: 'ASSA Compania de Seguros',
      configured: !!(process.env.ASSA_API_URL && process.env.ASSA_API_KEY),
    },
    { 
      code: 'CONNECT', 
      name: 'Connect Seguros',
      configured: !!(process.env.CONNECT_API_URL && process.env.CONNECT_API_KEY),
    },
    { 
      code: 'MOCK', 
      name: 'Mock Insurance (Development)',
      configured: true,
    },
  ];
}
