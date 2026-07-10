import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Header = ({ vehicleNumber, odometerKm }) => {
  return (
    <View style={styles.header}>
      <View style={styles.vehicleInfo}>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Vehicle Number</Text>
          <Text style={styles.value}>{vehicleNumber}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.label}>ODM KM</Text>
          <Text style={styles.value}>{odometerKm} KM</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#006D5B',
    padding: 16,
    paddingTop: 20,
  },
  vehicleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 4,
  },
  value: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Header;