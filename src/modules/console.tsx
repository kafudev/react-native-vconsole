import React, { Component } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Clipboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import JsonTree from 'react-native-json-tree';
import dayjs from 'dayjs';
import event from './event';
import { debounce } from './tool';
import theme from './theme';

function unixId() {
  return Math.round(Math.random() * 1000000).toString(16);
}

const LEVEL_ENUM = {
  All: '',
  Log: 'log',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
};

let logStack: any = null;

// log 消息类
class LogStack {
  private logs: {
    method(): void;
    data: string;
    time: string;
    id: string;
    index: number;
  }[];

  private maxLength: number;
  private listeners: { (): void }[];

  constructor() {
    this.logs = [];
    this.maxLength = 100;
    this.listeners = [];
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
      index: this.logs.length + 1,
      method,
      data,
      time: dayjs().format('YYYY-M-D HH:mm:ss SSS'),
      id: unixId(),
    });
    this.notify();
  }

  clearLogs() {
    this.logs = [];
    this.notify();
  }

  notify() {
    this.notify = debounce(350, false, () => {
      if (this.listeners && this.listeners[0]) {
        this.listeners.forEach((callback) => {
          callback();
        });
      }
    });
  }

  // @ts-ignore
  attach(callback) {
    this.listeners && this.listeners.push(callback);
  }
}

interface Props {}

interface StateType {
  logs: {
    method(): void;
    data: string;
    time: string;
    id: string;
    index: number;
  }[];
  filterLevel: string;
  filterValue: string;
}

class Console extends Component<Props, StateType> {
  private name: string;
  private textInput: any;
  private flatList: any;
  private mountState: boolean;
  private regInstance: any;

  // @ts-ignore
  constructor(props) {
    super(props);
    this.name = 'Log';
    this.textInput = null;
    this.mountState = false;
    this.state = {
      logs: [],
      filterLevel: '',
      filterValue: '',
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

  componentWillUnmount() {
    this.mountState = false;
    event.off('clear', this.clearLogs.bind(this));
  }

  clearLogs(name: string) {
    if (name === this.name) {
      logStack.clearLogs();
    }
  }

  ListHeaderComponent = () => {
    const count = Object.keys(this.state.logs || {}).length || 0;
    return (
      <View>
        <View style={{ flexDirection: 'row', backgroundColor: '#fff' }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', flex: 1.2 }}
            onPress={() => {
              this.flatList.scrollToEnd();
            }}
          >
            <Text style={styles.headerText}>({count})Index</Text>
          </TouchableOpacity>
          <Text style={styles.headerText}>Method</Text>
          <View
            style={[
              {
                flexDirection: 'row',
                flex: 3,
                paddingHorizontal: 0,
                borderWidth: 0,
              },
            ]}
          >
            {Object.keys(LEVEL_ENUM).map((key, index) => {
              return (
                <TouchableOpacity
                  key={index.toString()}
                  onPress={() => {
                    this.setState({
                      filterLevel: LEVEL_ENUM[key],
                    });
                  }}
                  style={[
                    styles.headerBtnLevel,
                    this.state.filterLevel == LEVEL_ENUM[key] && {
                      backgroundColor: '#eeeeee',
                      borderColor: '#959595a1',
                      borderWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Text style={styles.headerTextLevel}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.filterValueBar}>
          <TextInput
            ref={(ref) => {
              this.textInput = ref;
            }}
            style={styles.filterValueBarInput}
            // placeholderTextColor={'#000000a1'}
            placeholder="Enter the content, please submit to filter..."
            onSubmitEditing={({ nativeEvent }) => {
              if (nativeEvent) {
                this.regInstance = new RegExp(nativeEvent.text, 'ig');
                this.setState({ filterValue: nativeEvent.text });
              }
            }}
          />
          <TouchableOpacity
            style={styles.filterValueBarBtn}
            onPress={this.clearFilterValue.bind(this)}
          >
            <Text>X</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  clearFilterValue() {
    this.setState(
      {
        filterValue: '',
      },
      () => {
        // @ts-ignore
        this.textInput && this.textInput.clear();
      }
    );
  }

  // @ts-ignore
  renderLogItem = ({ item }) => {
    if (this.state.filterLevel && this.state.filterLevel != item.method)
      return null;
    if (
      this.state.filterValue &&
      this.regInstance &&
      !this.regInstance.test(item.data)
    )
      return null;
    let type = typeof item.data;
    if (type == 'object') {
      if (item.data === String(item.data)) {
        type = 'string';
      }
    }
    return (
      <TouchableWithoutFeedback
        onLongPress={() => {
          try {
            Clipboard.setString(`${strLog(item.data)}\r\n`);
            Alert.alert('Info', 'Copy successfully', [{ text: 'OK' }]);
          } catch (error) {}
        }}
      >
        <View style={styles.logItem}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 0.8 }}>
              <Text style={styles.logItemTime}>{item.index}</Text>
            </View>
            <View style={{ flex: 0.8 }}>
              <Text style={styles.logItemTime}>{item.method}</Text>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.logItemTime}>{item.time}</Text>
            </View>
            <View style={{ flex: 0.6 }}>
              <Text style={styles.logItemTime}>{type}</Text>
            </View>
          </View>

          <View>
            <Text style={[styles.logItemText, styles[item.method]]}>
              {strLog(item.data)}
            </Text>
          </View>
          <ScrollView
            automaticallyAdjustContentInsets={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            horizontal
          >
            {Array.isArray(item.data) || typeof item.data === 'object' ? (
              <JsonTree data={item.data} hideRoot theme={theme} />
            ) : null}
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    );
  };

  render() {
    return (
      <FlatList
        ref={(ref) => {
          this.flatList = ref;
        }}
        initialNumToRender={20}
        stickyHeaderIndices={[0]}
        showsVerticalScrollIndicator
        extraData={this.state}
        data={this.state.logs}
        ListHeaderComponent={this.ListHeaderComponent}
        renderItem={this.renderLogItem}
        ListEmptyComponent={() => <Text> Loading...</Text>}
        keyExtractor={(item) => item.id}
      />
    );
  }
}

const styles = StyleSheet.create({
  // logItem: {
  //   borderBottomWidth: StyleSheet.hairlineWidth,
  //   borderColor: '#d3d3d3',
  // },
  // logItemTime: {
  //   fontSize: 14,
  //   fontWeight: '700',
  //   paddingVertical: 6,
  //   textAlign: 'center',
  // },
  log: {
    color: '#000',
  },
  info: {
    color: '#000',
  },
  warn: {
    color: 'orange',
    backgroundColor: '#fffacd',
    borderColor: '#ffb930',
  },
  error: {
    color: '#dc143c',
    backgroundColor: '#ffe4e1',
    borderColor: '#f4a0ab',
  },
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
  },
  logItemText: {
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  logItemTime: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  filterValueBarBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eee',
  },
  filterValueBarInput: {
    flex: 1,
    paddingLeft: 10,
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  filterValueBar: {
    flexDirection: 'row',
    height: 40,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    borderBottomColor: '#ccc',
    marginBottom: 2,
  },
  headerText: {
    flex: 1,
    borderColor: '#eee',
    borderWidth: StyleSheet.hairlineWidth,
    // paddingVertical: 4,
    paddingHorizontal: 2,
    fontWeight: '700',
  },
  headerBtnLevel: {
    flex: 1,
    borderColor: '#eee',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
  },
  headerTextLevel: {
    fontWeight: '700',
    textAlign: 'center',
  },
});

function strLog(logs: any) {
  const arr = logs.map((data: any) => formatLog(data));
  return arr.join(' ');
}

function formatLog(obj: any): any {
  if (
    obj === null ||
    obj === undefined ||
    typeof obj === 'string' ||
    typeof obj === 'number' ||
    typeof obj === 'boolean' ||
    typeof obj === 'function'
  ) {
    return `${String(obj)}`;
  }
  if (obj instanceof Date) {
    return `Date(${obj.toISOString()})`;
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((elem) => formatLog(elem))}]`;
  }
  if (obj.toString) {
    try {
      return `${JSON.stringify(obj)}`;
    } catch (err) {
      return 'Invalid symbol';
    }
  }
  return 'unknown data';
}

function proxyConsole(console: any, stack: any) {
  const methods = [
    LEVEL_ENUM.Log,
    LEVEL_ENUM.Info,
    LEVEL_ENUM.Warn,
    LEVEL_ENUM.Error,
  ];
  methods.forEach((method) => {
    const fn = console[method];
    console[method] = function (...args: any) {
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
