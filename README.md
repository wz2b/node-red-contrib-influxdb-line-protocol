# node-red-contrib-influxdb-line-protocol

Parses [InfluxDB Line
Protocol](https://docs.influxdata.com/influxdb/v1.7/write_protocols/line_protocol_reference/)
to JSON and vice versa.  There is one node that transfers in both directions:
if you provide it an input that is an object, it produces line protocol (a string).  If
you provide it a string, it parses it as line protocol and emits an object.

What's nice about this format is that it's simple, and it works directly with
influxdb, telegraf (via MQTT if you like), or the line protocol input to
the cloud grafana.com (which is really prometheus, but has a line protocol
compatible input method).

The parser and formatter functions in this node aren't particularily strong.
They are rather simple, but they work for all of the original author's use cases.
If you encounter any limitations or problems feel free to report a bug
via github.


## configuration

This node requires no configuration and by default will write all fields as
either floats, strings, or booleans depending on the input type.  One of the
behaviors of influxdb is that you can't switch fields between float and int once
the first point has been written.  Most people are fine with just writing
floats, but there are certain situations where you need to force the type to
an integer, including:

 * pre-existing fields in a measurement that are in integer format
 * scientific requirements that numbers be exact
 * need to do comparisons against exact int values without worrying about float/double ULPs
 * specific performance concerns that are helped by data being floats

In these cases, the node configuration allows you to set a default type (which
defaults to float) and a list of specific fields that need to be mapped to one
type or the other.  This is completely optional; if you do nothing, everything
will be written to line protocol as a float.

This type mapping mechanism only affects the JSON to line protocol conversion
direction.  It stems from the fact that there are not really ints in basic
javascript, only 'number'.

## Rounding

If you specify that a field be transformed to an integer, but the input value has
a fractional component, it will be rounded.  If someone has the need for this
behavior to be selectable (for example Math.ceil() or Math.floor()) please
submit an issue.


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
