---
layout: post
title: "Real-time Data Processing with Apache Kafka"
date: 2022-07-25
tags: [apache-kafka, real-time-processing, streaming, event-driven-architecture]
---

# Real-time Data Processing with Apache Kafka

In today's fast-paced digital world, the ability to process data in real-time is crucial. Apache Kafka has emerged as the de facto standard for building real-time streaming data pipelines.

## Why Apache Kafka?

Kafka provides:
- **High throughput**: Handle millions of messages per second
- **Low latency**: Sub-millisecond message delivery
- **Fault tolerance**: Distributed architecture with replication
- **Scalability**: Horizontal scaling across multiple brokers
- **Durability**: Persistent storage with configurable retention

## Kafka Architecture Overview

### Core Components
- **Producers**: Applications that send data to Kafka topics
- **Consumers**: Applications that read data from Kafka topics
- **Brokers**: Kafka servers that store and serve data
- **Topics**: Categories or feeds of messages
- **Partitions**: Scalable units within topics

## Setting Up Kafka

### Docker Compose Setup
```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

### Creating Topics
```bash
# Create a topic for user events
kafka-topics --create \
  --bootstrap-server localhost:9092 \
  --topic user-events \
  --partitions 3 \
  --replication-factor 1
```

## Building Kafka Producers

### Python Producer Example
```python
from kafka import KafkaProducer
import json
import time
from datetime import datetime

class UserEventProducer:
    def __init__(self, bootstrap_servers=['localhost:9092']):
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda x: json.dumps(x).encode('utf-8'),
            key_serializer=lambda x: x.encode('utf-8') if x else None,
            acks='all',  # Wait for all replicas to acknowledge
            retries=3,
            batch_size=16384,
            linger_ms=10
        )
    
    def send_user_event(self, user_id, event_type, event_data):
        event = {
            'user_id': user_id,
            'event_type': event_type,
            'event_data': event_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Use user_id as partition key for ordering
        self.producer.send(
            'user-events',
            key=str(user_id),
            value=event
        )
    
    def close(self):
        self.producer.flush()
        self.producer.close()

# Usage example
producer = UserEventProducer()
producer.send_user_event(
    user_id=12345,
    event_type='page_view',
    event_data={'page': '/products', 'duration': 45}
)
```

### Java Producer Example
```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public class UserEventProducer {
    private final Producer<String, String> producer;
    
    public UserEventProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, 3);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);
        
        this.producer = new KafkaProducer<>(props);
    }
    
    public void sendEvent(String userId, String eventJson) {
        ProducerRecord<String, String> record = 
            new ProducerRecord<>("user-events", userId, eventJson);
        
        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                exception.printStackTrace();
            } else {
                System.out.printf("Sent event to partition %d with offset %d%n",
                    metadata.partition(), metadata.offset());
            }
        });
    }
}
```

## Building Kafka Consumers

### Python Consumer Example
```python
from kafka import KafkaConsumer
import json

class UserEventConsumer:
    def __init__(self, group_id, bootstrap_servers=['localhost:9092']):
        self.consumer = KafkaConsumer(
            'user-events',
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            key_deserializer=lambda x: x.decode('utf-8') if x else None,
            auto_offset_reset='earliest',
            enable_auto_commit=False
        )
    
    def process_events(self):
        for message in self.consumer:
            try:
                event = message.value
                user_id = message.key
                
                # Process the event
                self.handle_event(user_id, event)
                
                # Commit offset after successful processing
                self.consumer.commit()
                
            except Exception as e:
                print(f"Error processing event: {e}")
                # Handle error (retry, dead letter queue, etc.)
    
    def handle_event(self, user_id, event):
        event_type = event['event_type']
        
        if event_type == 'page_view':
            self.update_user_analytics(user_id, event)
        elif event_type == 'purchase':
            self.process_purchase(user_id, event)
        
        print(f"Processed {event_type} for user {user_id}")
    
    def update_user_analytics(self, user_id, event):
        # Update real-time analytics
        pass
    
    def process_purchase(self, user_id, event):
        # Process purchase event
        pass

# Usage
consumer = UserEventConsumer(group_id='analytics-service')
consumer.process_events()
```

## Stream Processing with Kafka Streams

### Real-time Aggregations
```java
import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.kstream.*;
import java.time.Duration;

public class UserEventAnalytics {
    public static void main(String[] args) {
        StreamsBuilder builder = new StreamsBuilder();
        
        KStream<String, String> events = builder.stream("user-events");
        
        // Count events by type in 5-minute windows
        KTable<Windowed<String>, Long> eventCounts = events
            .selectKey((key, value) -> extractEventType(value))
            .groupByKey()
            .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))
            .count();
        
        // Output to results topic
        eventCounts.toStream()
            .map((key, value) -> KeyValue.pair(
                key.key() + "@" + key.window().start(),
                value.toString()
            ))
            .to("event-counts");
        
        KafkaStreams streams = new KafkaStreams(builder.build(), getProperties());
        streams.start();
    }
    
    private static String extractEventType(String eventJson) {
        // Parse JSON and extract event_type
        return "page_view"; // Simplified
    }
}
```

## Advanced Kafka Patterns

### Exactly-Once Processing
```python
from kafka import KafkaConsumer, KafkaProducer
import psycopg2

class ExactlyOnceProcessor:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'input-topic',
            group_id='processor-group',
            enable_auto_commit=False,
            isolation_level='read_committed'
        )
        
        self.producer = KafkaProducer(
            transactional_id='processor-tx',
            enable_idempotence=True
        )
        
        self.db_conn = psycopg2.connect(
            host='localhost',
            database='analytics',
            user='user',
            password='password'
        )
    
    def process_with_transactions(self):
        self.producer.init_transactions()
        
        for message in self.consumer:
            try:
                self.producer.begin_transaction()
                
                # Process message
                result = self.process_message(message.value)
                
                # Send to output topic
                self.producer.send('output-topic', result)
                
                # Update database
                with self.db_conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO processed_events (id, data) VALUES (%s, %s)",
                        (message.offset, result)
                    )
                
                # Commit transaction
                self.producer.commit_transaction()
                self.db_conn.commit()
                
                # Commit Kafka offset
                self.consumer.commit()
                
            except Exception as e:
                self.producer.abort_transaction()
                self.db_conn.rollback()
                print(f"Transaction aborted: {e}")
```

## Monitoring and Operations

### Key Metrics to Monitor
```python
# Example monitoring with Prometheus
from prometheus_client import Counter, Histogram, Gauge

# Metrics
messages_produced = Counter('kafka_messages_produced_total', 'Total messages produced')
processing_time = Histogram('kafka_message_processing_seconds', 'Message processing time')
consumer_lag = Gauge('kafka_consumer_lag', 'Consumer lag by partition')

def monitor_consumer_lag():
    # Get consumer group metadata
    admin_client = KafkaAdminClient(bootstrap_servers=['localhost:9092'])
    
    # Calculate and expose lag metrics
    for partition_metadata in get_consumer_lag():
        consumer_lag.labels(
            topic=partition_metadata.topic,
            partition=partition_metadata.partition
        ).set(partition_metadata.lag)
```

## Best Practices

### 1. Topic Design
- Use meaningful topic names
- Plan partition strategy carefully
- Set appropriate retention policies

### 2. Producer Optimization
```python
# Optimized producer configuration
producer_config = {
    'bootstrap_servers': ['localhost:9092'],
    'acks': 'all',
    'retries': 3,
    'batch_size': 16384,
    'linger_ms': 10,
    'compression_type': 'snappy',
    'max_in_flight_requests_per_connection': 5,
    'enable_idempotence': True
}
```

### 3. Consumer Best Practices
- Handle rebalancing gracefully
- Implement proper error handling
- Monitor consumer lag
- Use appropriate commit strategies

## Common Use Cases

1. **Real-time Analytics**: Process events for dashboards
2. **Event Sourcing**: Store all state changes as events
3. **Microservices Communication**: Decouple services with events
4. **Log Aggregation**: Centralize logs from multiple services
5. **Change Data Capture**: Stream database changes

## Next Steps

In upcoming posts, I'll cover:
- Kafka Connect for data integration
- Schema Registry and Avro serialization
- Kafka security and multi-tenancy
- Performance tuning and troubleshooting

Apache Kafka enables building robust, scalable real-time data processing systems that form the backbone of modern data architectures.

---

*Working with Kafka in production? Share your experiences and challenges!*