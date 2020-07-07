var AWS = require('aws-sdk')
var dns = require('dns')

AWS.config.update({ region: 'us-west-2' })
var Route53 = new AWS.Route53()
var rds = new AWS.RDS()

exports.handler = (event) => {
    // console.log(event);
    
    var clusterIdentifier = event.detail.SourceIdentifier
    var eventMessage = event.detail.Message
    var location = eventMessage.search('Completed failover')
    var dbClusterToWorkOn = 'standard3' // set your DB cluster that you want the changes to be done for
    if(clusterIdentifier!= dbClusterToWorkOn) { console.log('Not our cluster'); return }
    if(location == -1) { // When message is not found it returns -1. It means that its not a failover completed event.
        console.log('not a completed failover event')
        return 0
    } else console.log('its a failover event. Will change IP address')

    var paramsDB = {
        DBClusterIdentifier: clusterIdentifier
    };
    rds.describeDBClusters(paramsDB, function (err, data) { // get the details of the cluster. We need the endpoint to get its IP address
        console.log(' Got data from RDS. No will proceed to change IP address')
        if (err) console.log(err, err.stack); // an error occurred
        else {
            var endpoint = data.DBClusters[0].Endpoint
            var hostedZoneId = 'Z08438332D4MC5W4Y99B9' // change this for your environment
            var privateRecordSet = "rds.standard.local" // change this for your environment

            const options = { family: 4, hints: dns.ADDRCONFIG | dns.V4MAPPED };

            dns.lookup(endpoint, options, (err, ipAddress, family) => {
                if(err) { console.log('error occured resolving rds endpoint ip Address'); return }
                
                var params = {
                    ChangeBatch: {
                        Changes: [
                            {
                                Action: "UPSERT",
                                ResourceRecordSet: { Name: privateRecordSet, ResourceRecords: [{ Value: ipAddress }], TTL: 60, Type: "A" }
                            }
                        ],
                        Comment: "from lambda"
                    },
                    HostedZoneId: hostedZoneId
                };
                console.log('IP Address: ', ipAddress)
                Route53.changeResourceRecordSets(params, (R53error, data) => {
                    if (R53error) { console.log(R53error) }
                    else {
                        console.log(data)
                        return 1
                    } 
                })
            })
        }
    });
};
