/**
 * Quick test script to verify model loading works
 */
import { loadModel } from './src/model/driftModel.js'

try {
  console.log('Testing model loading...')
  const model = loadModel()
  console.log('✅ Model loaded successfully!')
  console.log(`   Baseline runs: ${model.baselineRunCount}`)
  console.log(`   Features: ${Object.keys(model.features).length}`)
  console.log(`   Trained at: ${model.trainedAt}`)
  process.exit(0)
} catch (error) {
  console.error('❌ Failed to load model:', error.message)
  process.exit(1)
}
