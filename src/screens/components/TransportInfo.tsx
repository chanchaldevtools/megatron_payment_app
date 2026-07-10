import React from 'react';
import { View, Text, StyleSheet,ScrollView } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const TransportInfo = ({ transportDate, source, destination, receivingAmount }) => {
  return (
    <ScrollView>
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.column}>
          <Text style={styles.label}>Transport Date</Text>
          <Text style={styles.value}>{transportDate}</Text>
        </View>
        <View style={styles.column}>
          <Text style={styles.label}>Receiving Amount</Text>
          <Text style={[styles.value, styles.amount]}>{receivingAmount}</Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>Source</Text>
          <Text style={styles.routeValue}>{source}</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.routeItem}>
          <Text style={styles.routeLabel}>Destination</Text>
          <Text style={styles.routeValue}>{destination}</Text>
        </View>
      </View>
    </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: wp('4%'),
    marginVertical: hp('1%'),
    marginHorizontal: wp('2%'),
    borderRadius: wp('3%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp('2%'),
  },
  column: {
    flex: 1,
  },
  label: {
    fontSize: wp('3.2%'),
    color: '#666',
    marginBottom: hp('0.5%'),
  },
  value: {
    fontSize: wp('4%'),
    fontWeight: '600',
    color: '#333',
  },
  amount: {
    color: '#006D5B',
    fontWeight: 'bold',
  },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: hp('1.5%'),
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  routeItem: {
    flex: 1,
  },
  routeLabel: {
    fontSize: wp('3.2%'),
    color: '#666',
    marginBottom: hp('0.5%'),
  },
  routeValue: {
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#333',
  },
  arrow: {
    paddingHorizontal: wp('4%'),
  },
  arrowText: {
    fontSize: wp('6%'),
    color: '#006D5B',
    fontWeight: 'bold',
  },
});

export default TransportInfo;
