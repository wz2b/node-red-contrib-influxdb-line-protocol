# node-red-contrib-influxdb-line-protocol

Parses [InfluxDB Line
Protocol](https://docs.influxdata.com/influxdb/v1.7/write_protocols/line_protocol_reference/)
to JSON and vice versa.

I like this protocol because it's so easy to format. All my Arduino* sensors
output this format on MQTT, and with the help of this Node I can parse,
transform, and reformat my sensor data in Node-RED and then feed it back into
MQTT where it's picked up by Telegraf/InfluxDB.

The parser and formatter functions in this node aren't particularily strong.
They are rather simple, but they work for all of my use cases. If you encounter
any limitations with your data, feel free to report a bug or submit a PR
yourself.

## Example

The following input string in `msg.payload`:

```
measurementName,tag1=tagValue1,tag2=tagValue2 field1=42,field2=1337,field3="foobar" 1546300800000000000
```

Will yield this JSON output in `msg.payload`:

```json
{
  "measurement": "measurementName",
  "tags": {
    "tag1": "tagValue1",
    "tag2": "tagValue2"
  },
  "fields": {
    "field1": 42,
    "field2": 1337,
    "field3": "foobar"
  },
  "timestamp": 1546300800000
}
```

It works the other way around, too. Whatever you feed in (`string` or `Object`)
is parsed or formatted, respectively.

### Array operation

If your `msg.payload` is an array, it will operate on each item independently.
That may actually lead to some items being parsed and others being formatted,
depending on the previous state. Filter or map your content beforehand, if this
is not desired.

### Options

You can check the `addTimestamp` option. In that case, if a point does not
contain a timestamp (nanosecond epoch at end in string form, or millisecond
epoch `timestamp` field in JSON object), it will be added with the current
time. 

This will never override an existing truthy timestamp value. Strip or override
it yourself, preferably while your data is in JSON form, if you need such
behaviour.

## License

[MIT](./LICENSE.txt)
