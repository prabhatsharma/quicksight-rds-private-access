# RDS private endpoint access from quicksight

## Poblem statement:

Quicksight is unable to access an RDS cluster privatele if it aslso has public access.

## Detail

RDS provides access either publicly(and privately in VPC) or privately(only from VPC).
Quicksight can access RDS for visualization if RDS is in private VPC. 
Quicksight can access RDS publicly for visualization if RDS is available publicly and accessed publicly.

If you have enabled RDS public acces and enabled access only from specified IP addresses and if you try to access Quicksight over VPC then it does not work.

## Solution

1. We will create a private hosted zone in route53 with IP address (not CNAME) of RDS cluster endpoint.
1. We will then use route53 resolver to create an incoming endpoint for the specifc VPC
1. We will then create a quicksight connection using route53 resolver for the private recordset.

The above will allow the RDS cluster to be accessed by quicksight. 

It however will have a challenge when their is a failover event in RDS and its endpoint IP address changes.

We will create a lambda to listen to the cluster failover event. This lambda will get the new IP address for the cluster endpoint and update the route53 recordset.

Make sure that your lambda has following permissions:
1. Call RDS describeDBClusters
1. Call Route53 changeResourceRecordSets 
1. And your lambda is running in the VPC. This will help lambda resolve private IP address instead of public IP address for RDS endpoint.


event pattern for cloudwatch event is:

```json
{
  "source": [
    "aws.rds"
  ],
  "detail-type": [
    "RDS DB Cluster Event"
  ]
}
```
