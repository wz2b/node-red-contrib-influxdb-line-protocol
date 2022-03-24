
/*
 * Take the input value and output it as a string.
 * If the input value is numeric, look at the given numeric field type.
 * If it is 'int' output it as a line protocol int (i.e. 1234i)
 * Otherwise, output it as a float.
 */
function formatValue(v, numericType) {
  if (typeof v === 'number') {
    if ( numericType== "int") {
      intValue = Math.round(v);
      return `${v}i`
    } else if(numericType == "float") {
      return String(v)
    } else {
      /*
       * Don't know what this numeric format is - we shouldn't ever hit this condition.  Treat
       * it as a float.  Note that reverting to the original node's behavior, where you test
       * if (v == Math.round(v)) is not really an option - that test will always fail if you
       * mean to write a float but that float happens to be a precise integer value.  This
       * will prevent InfluxDB from inserting the entire row, so it's never really OK to do that.
       */
      return String(v)
    }
  } else if (typeof v === 'boolean') {
    return v ? 'TRUE' : 'FALSE'
  } else {
    return JSON.stringify(v)
  }
}

function formatDate(date) {
  return (date instanceof Date ? date.getTime() : date) * 1000000
}

const INT_REGEX = /^\d+i$/
const TRUE_REGEX = /^(t|true)$/i
const FALSE_REGEX = /^(f|false)$/i
const STRING_REGEX = /^"(.*)"$/

function parseValue(value) {
  if (value == null) {
    return undefined
  } else if (INT_REGEX.test(value)) {
    return parseInt(value.slice(0, -1))
  } else if (TRUE_REGEX.test(value)) {
    return true
  } else if (FALSE_REGEX.test(value)) {
    return false
  } else if (STRING_REGEX.test(value)) {
    return value.slice(1, -1)
  } else if (!isNaN(value)) {
    return parseFloat(value)
  } else {
    return undefined
  }
}

function joinObject(obj, withFormatting, config) {
  if (!obj) return ''

  return Object.keys(obj)
    .map(key => {
      let override = config.typeMappings.find( (i) => i.fieldName == key);
      let numType = override?.fieldType || config.defaultTypeMapping;
      return `${key}=${withFormatting ? formatValue(obj[key], numType) : obj[key]}`
    })
    .join(',')
}

function parse(point, config) {
  const result = {}

  const [tags_, fields_, timestamp] = point.split(' ')

  const tags = (tags_ || '').split(',')
  const fields = (fields_ || '').split(',')

  result.measurement = tags.shift()

  result.tags = tags.reduce((out, tag) => {
    if (!tag) return out
    var [key, value] = tag.split('=')
    out[key] = value
    return out
  }, {})

  result.fields = fields.reduce((out, field) => {
    if (!field) return out
    var [key, value] = field.split('=')
    out[key] = parseValue(value)
    return out
  }, {})

  if (timestamp) {
    result.timestamp = parseInt(timestamp) / 1000000
  } else if (config.addTimestamp) {
    result.timestamp = Date.now()
  }

  return result
}

function format(pointJson, config) {
  const {measurement, tags, fields, timestamp} = pointJson

  var str = measurement

  const tagsStr = joinObject(tags, false, config)
  if (tagsStr) {
    str += ',' + tagsStr
  }

  str += ' ' + joinObject(fields, true, config)

  if (timestamp) {
    str += ' ' + formatDate(timestamp)
  } else if (config.addTimestamp) {
    str += ' ' + formatDate(new Date())
  }

  return str
}

function transform(item, config) {
  // Find out type of item, either parse it if it's a string, or
  // format it if it's plain JSON with at least a `measurement` key,
  // else, leave item as-is, we have no business here.

  if (item == null) {
    return item
  } else if (typeof item === 'string') {
    /* converting an influx line protocol string into a JSON object */
    return parse(item, config)
  } else if (typeof item === 'object' && 'measurement' in item) {
    /* converting an object into a string using influx line protocol */
    return format(item, config)
  } else {
    return item
  }
}

function transformArray(itemOrArray, config) {
  if (itemOrArray && Array.isArray(itemOrArray)) {
    return itemOrArray.map(item => transform(item, config))
  } else {
    return transform(itemOrArray, config)
  }
}

module.exports = function(RED) {
  function InfluxdbLineProtocolNode(config) {
    var node = this;
    RED.nodes.createNode(node, config)
    node.on('input', function(msg) {
      try {
        msg.payload = transformArray(msg.payload, config)
        node.send(msg)
      } catch (err) {
        node.error(err);
      }
    })
  }

  RED.nodes.registerType('influxdb-line-protocol', InfluxdbLineProtocolNode)
}
