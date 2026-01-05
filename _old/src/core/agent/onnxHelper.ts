import * as ort from 'onnxruntime-web';

export class ONNXModule {
  public modelPath: string;
  public metaData: any;
  public isRecurrent: boolean;
  public session: ort.InferenceSession | null = null;
  public inKeys: string[] = [];
  public outKeys: string[] = [];

  constructor(config) {
    if (!config || !config.path || !config.meta) {
      throw new Error('ONNXModule config must have path and meta properties');
    }
    this.modelPath = config.path;
    this.metaData = config.meta;
    if (!this.metaData.in_keys) {
      throw new Error('ONNXModule meta must have in_keys property');
    }
    this.isRecurrent = config.meta.in_keys.includes("adapt_hx");
    console.log("isRecurrent", this.isRecurrent);
  }

  async init() {
    try {
      // Load the ONNX model
      console.log('[ONNXModule] Fetching model from:', this.modelPath);
      const modelResponse = await fetch(this.modelPath);
      if (!modelResponse.ok) {
        throw new Error(`Failed to fetch model: ${modelResponse.status} ${modelResponse.statusText}`);
      }
      const modelArrayBuffer = await modelResponse.arrayBuffer();
      console.log('[ONNXModule] Model fetched, size:', modelArrayBuffer.byteLength);

      this.inKeys = this.metaData["in_keys"];
      this.outKeys = this.metaData["out_keys"];

      // Create session from the array buffer
      console.log('[ONNXModule] Creating ONNX session...');
      this.session = await ort.InferenceSession.create(modelArrayBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
      });

      console.log('[ONNXModule] ONNX model loaded successfully');
      console.log("inKeys", this.inKeys);
      console.log("outKeys", this.outKeys);
      console.log("inputNames", this.session.inputNames);
      console.log("outputNames", this.session.outputNames);
    } catch (error) {
      console.error('[ONNXModule] Failed to initialize:', error);
      throw error;
    }
  }

  initInput() {
    if (this.isRecurrent) {
      return {
        "is_init": new ort.Tensor('bool', [true], [1]),
        "adapt_hx": new ort.Tensor('float32', new Float32Array(128), [1, 128])
      }
    } else {
      return {};
    }
  }

  async runInference(input) {
    // construct input
    if (!this.inKeys || !this.session) {
      throw new Error('ONNXModule not properly initialized. inKeys: ' + this.inKeys + ', session: ' + this.session);
    }
    let onnxInput = {};
    for (let i = 0; i < this.inKeys.length; i++) {
      onnxInput[this.session.inputNames[i]] = input[this.inKeys[i]];
    }
    // run inference
    const onnxOutput = await this.session.run(onnxInput);
    // construct output
    let result = {};
    for (let i = 0; i < this.outKeys.length; i++) {
      result[this.outKeys[i]] = onnxOutput[this.session.outputNames[i]];
    }
    let carry = {};
    if (this.isRecurrent) {
      carry["is_init"] = new ort.Tensor('bool', [false], [1]);
      carry["adapt_hx"] = result["next,adapt_hx"];
    }
    return [result, carry];
  }
}
