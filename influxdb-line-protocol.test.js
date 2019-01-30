const helper = require('node-red-node-test-helper')
const InfluxdbLineProtocolNode = require('./influxdb-line-protocol.js')

helper.init(require.resolve('node-red'))

function testFlow(nodeProps, input) {
  return new Promise((resolve, reject) => {
    try {
      const flow = [
        {id: 'testNode', ...nodeProps, wires: [['helperNode']]},
        {id: 'helperNode', type: 'helper'},
      ]

      helper.load(InfluxdbLineProtocolNode, flow, function() {
        const testNode = helper.getNode('testNode')
        const helperNode = helper.getNode('helperNode')

        helperNode.on('input', function(msg) {
          resolve(msg.payload)
        })

        helperNode.on('error', function(err) {
          reject(err)
        })
        testNode.on('call:warn', call => {
          reject(call)
        })

        try {
          testNode.receive({payload: input})
        } catch (err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

describe('influxdb-line-protocol', function() {
  afterEach(function() {
    helper.unload()
  })

  it('should format an empty measurement as string', async () => {
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Format Node'},
      {measurement: 'measurementName'}
    )
    expect(result).toMatchSnapshot()
  })

  it('should format complicated fields as string', async () => {
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Format Node'},
      {
        measurement: 'measurementName',
        fields: {
          intValue: 123,
          floatValue: 123.45,
          strValue: '123',
          boolValue: false,
        },
        tags: {
          tag1: 'foo',
          tag2: 'bar',
        },
        timestamp: 1231313123,
      }
    )
    expect(result).toMatchSnapshot()
  })

  it('should parse an empty measurement to JSON', async () => {
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Node'},
      'measurementName'
    )
    expect(result).toMatchSnapshot()
  })

  it('should parse complicated fields to JSON', async () => {
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Node'},
      'measurementName,tag=tagValue,tag2=tag2Value field1=123i,field2=123,field3="foo",field4=True 123123123'
    )
    expect(result).toMatchSnapshot()
  })

  it('should parse mixed arrays', async () => {
    const result = await testFlow({type: 'influxdb-line-protocol', name: 'Test Node'}, [
      'measurementName,tag=tagValue,tag2=tag2Value field1=123i,field2=123,field3="foo",field4=True 123123123',
      {measurement: 'measurementName2'},
    ])
    expect(result).toMatchSnapshot()
  })

  it('should add timestamp while parsing', async () => {
    const start = Date.now()
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Node', addTimestamp: true},
      'measurementName'
    )
    const end = Date.now()
    expect(result).toHaveProperty('measurement', 'measurementName')
    expect(result).toHaveProperty('timestamp')
    expect(result.timestamp).toBeGreaterThanOrEqual(start)
    expect(result.timestamp).toBeLessThanOrEqual(end)
  })

  it('should add timestamp while formatting', async () => {
    const start = Date.now()
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Node', addTimestamp: true},
      {measurement: 'test'}
    )
    const end = Date.now()
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^test +[0-9]*$/)
    const [time_] = result.match(/[0-9]+/)
    const time = parseInt(time_, 10) / 1000000
    expect(time).toBeGreaterThanOrEqual(start)
    expect(time).toBeLessThanOrEqual(end)
  })

  it('should ignore other objects', async () => {
    const input = {foo: 'test'}
    const result = await testFlow(
      {type: 'influxdb-line-protocol', name: 'Test Node', addTimestamp: true},
      input
    )
    expect(result).toEqual(input)
  })
})
