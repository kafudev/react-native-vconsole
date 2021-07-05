import React, { Component } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import JsonTree from 'react-native-json-tree';
import dayjs from 'dayjs';
import event from './event';
import { debounce } from './tool';
import theme from './theme';

function unixId() {
  return Math.round(Math.random() * 1000000).toString(16);
}

let logStack: any = null;

// log 消息类
class LogStack {
  private logs: {
    method(): void;
    data: string;
    time: string;
    id: string;
  }[];

  private maxLength: number;
  private listeners: { (): void }[];

  constructor() {
    this.logs = [];
    this.maxLength = 100;
    this.listeners = [];
    this.notify = debounce(500, false, this.notify);
  }

  getLogs() {
    return this.logs;
  }

  // @ts-ignore
  addLog(method, data) {
    if (this.logs.length > this.maxLength) {
      this.logs = this.logs.slice(1);
    }
    this.logs.push({
      method,
      data,
      time: dayjs().format('YYYY年M月D日 HH:mm:ss SSS'),
      id: unixId(),
    });
    this.notify();
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }

  notify() {
    if (this.listeners && this.listeners[0]) {
      this.listeners.forEach((callback) => {
        callback();
      });
    }
  }

  // @ts-ignore
  attach(callback) {
    this.listeners && this.listeners.push(callback);
  }
}

interface Props {}

interface State {
  logs: {
    method(): void;
    data: string;
    time: string;
    id: string;
  }[];
}

class Console extends Component<Props, State> {
  private name: string;
  private mountState: boolean;

  // @ts-ignore
  constructor(props) {
    super(props);
    this.name = 'Log';
    this.mountState = false;
    this.state = {
      logs: [],
    };
    logStack.attach(() => {
      if (this.mountState) {
        this.setState({
          logs: logStack.getLogs(),
        });
      }
    });
  }

  componentDidMount() {
    this.mountState = true;
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      logs: logStack.getLogs(),
    });
    event.on('clear', this.clearLogs.bind(this));
  }

  // @ts-ignore
  shouldComponentUpdate(nextProps, nextState) {
    return nextState.logs.length !== this.state.logs.length;
  }

  componentWillUnmount() {
    this.mountState = false;
    event.off('clear', this.clearLogs.bind(this));
  }

  clearLogs(name: string) {
    if (name === this.name) {
      logStack.clearLogs();
    }
  }

  // @ts-ignore
  renderLogItem({ item }) {
    return (
      <View style={styles.logItem}>
        <Text style={styles.logItemTime}>{item.time}</Text>
        <ScrollView
          automaticallyAdjustContentInsets={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          horizontal
        >
          <JsonTree data={item.data} hideRoot theme={theme} />
        </ScrollView>
      </View>
    );
  }

  render() {
    return (
      <FlatList
        initialNumToRender={20}
        showsVerticalScrollIndicator
        extraData={this.state}
        data={this.state.logs}
        renderItem={this.renderLogItem}
        ListEmptyComponent={() => <Text> Loading...</Text>}
        keyExtractor={(item) => item.id}
      />
    );
  }
}

const styles = StyleSheet.create({
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#d3d3d3',
  },
  logItemTime: {
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 6,
    textAlign: 'center',
  },
});

// @ts-ignore
function proxyConsole(console: {}, stack) {
  const methods = ['log', 'error', 'info'];
  methods.forEach((method) => {
    const fn = console[method];
    // @ts-ignore
    console[method] = (...args) => {
      stack.addLog(method, args);
      fn.apply(console, args);
    };
  });
}

module.exports = (() => {
  if (!logStack) {
    logStack = new LogStack();
  }
  proxyConsole(global.console, logStack);
  return <Console />;
})();
