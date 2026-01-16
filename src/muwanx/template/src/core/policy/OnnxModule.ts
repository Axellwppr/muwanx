import * as ort from 'onnxruntime-web';

export type OnnxConfig = {
  path: string;
  meta?: {
    in_keys?: string[];
    out_keys?: string[];
  };
};

export class OnnxModule {
  private config: OnnxConfig;
  private session: ort.InferenceSession | null;
  inKeys: string[];
  outKeys: string[];
  isRecurrent: boolean;

  constructor(config: OnnxConfig) {
    if (!config?.path) {
      throw new Error('OnnxModule requires a path.');
    }
    this.config = config;
    this.session = null;
    this.inKeys = config.meta?.in_keys ?? ['policy'];
    this.outKeys = config.meta?.out_keys ?? ['action'];
    this.isRecurrent = this.inKeys.includes('adapt_hx');
  }

  async init(): Promise<void> {
    const response = await fetch(this.config.path);
    if (!response.ok) {
      throw new Error(`Failed to fetch ONNX model: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    this.session = await ort.InferenceSession.create(buffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
  }

  initInput(): Record<string, ort.Tensor> {
    if (this.isRecurrent) {
      return {
        is_init: new ort.Tensor('bool', [true], [1]),
        adapt_hx: new ort.Tensor('float32', new Float32Array(128), [1, 128]),
      };
    }
    return {};
  }

  async runInference(
    input: Record<string, ort.Tensor>
  ): Promise<[Record<string, ort.Tensor>, Record<string, ort.Tensor>]> {
    if (!this.session) {
      throw new Error('OnnxModule not initialized.');
    }

    const onnxInput: Record<string, ort.Tensor> = {};
    for (let i = 0; i < this.inKeys.length; i++) {
      const key = this.inKeys[i];
      const name = this.session.inputNames[i];
      if (!name || !input[key]) {
        throw new Error(`Missing ONNX input for key: ${key}`);
      }
      onnxInput[name] = input[key];
    }

    const onnxOutput = await this.session.run(onnxInput);
    const result: Record<string, ort.Tensor> = {};
    for (let i = 0; i < this.outKeys.length; i++) {
      const key = this.outKeys[i];
      const name = this.session.outputNames[i];
      if (name && onnxOutput[name]) {
        result[key] = onnxOutput[name];
      }
    }

    const carry: Record<string, ort.Tensor> = {};
    if (this.isRecurrent && result['next,adapt_hx']) {
      carry.is_init = new ort.Tensor('bool', [false], [1]);
      carry.adapt_hx = result['next,adapt_hx'];
    }

    return [result, carry];
  }
}
