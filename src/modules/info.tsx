import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  info: {} | string;
}

interface State {
  info: string;
}

export default class Info extends Component<Props, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      info: '',
    };
  }

  static getDerivedStateFromProps(nextProps: Readonly<Props>) {
    let { info } = nextProps;
    if (info) {
      if (typeof info === 'object') {
        try {
          info = JSON.stringify(info, null, 2);
        } catch (err) {
          console.log(err);
        }
      }
      return { info };
    }
    return null;
  }

  render() {
    return (
      <View style={styles.viewbox}>
        <Text style={styles.viewtext}>{this.state.info}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  viewbox: {
    padding: 5,
  },
  viewtext: {
    color: 'black',
  },
});
