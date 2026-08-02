import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const model = 'Xenova/all-MiniLM-L6-v2';
const revision = '751bff37182d3f1213fa05d7196b954e230abad9';
const output = resolve('public/models/Xenova/all-MiniLM-L6-v2');
const files = ['config.json', 'special_tokens_map.json', 'tokenizer.json', 'tokenizer_config.json', 'vocab.txt', 'onnx/model_quantized.onnx'];
const expectedOnnxSha256 = 'afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1';

await mkdir(join(output, 'onnx'), { recursive: true });
for (const file of files) {
  const url = `https://huggingface.co/${model}/resolve/${revision}/${file}?download=true`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${file}: ${response.status}`);
  await writeFile(join(output, file), new Uint8Array(await response.arrayBuffer()));
  console.log(`downloaded ${file}`);
}
const modelBytes = await (await import('node:fs/promises')).readFile(join(output, 'onnx/model_quantized.onnx'));
const digest = createHash('sha256').update(modelBytes).digest('hex');
if (digest !== expectedOnnxSha256) throw new Error(`Model checksum mismatch: ${digest}`);
console.log({ model, revision, sha256: digest });
