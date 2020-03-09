
# Broker
Simple ETCD backed job queue

This package is in a very early stage and for the moment only supports simple leader election, but the plan is to have it be a fully fledged job queue.

### Start it

Create a new broker instance:
```
const broker = new Broker({ queue: 'default' });
// Attach to ETCD queue
broker.attach();
```

### Config parameters

#### queue (mandatory)
Name of queue to join, this will be used as ETCD key prefix.
#### etcd.hosts
String or array of etcd hosts that is passed to @forest.host/etcd3
#### verbosity
Log level of broker module
#### timeout
Etcd leader election timeout
#### campaign.value
Etcd leader election campaign value
