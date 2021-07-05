import React, { Component } from 'react';
import {
  Clipboard,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import JsonTree from 'react-native-json-tree';
import event from './event';
import { debounce } from './tool';
import theme from './theme';

let ajaxStack: any = null;

function JSONTryParse(jsonStr: string) {
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    return {};
  }
}

class AjaxStack {
  private requestIds: string[];
  private requests: {};
  private maxLength: number;
  private listeners: { (arg?: any): void }[];

  constructor() {
    this.requestIds = [];
    this.requests = {};
    this.maxLength = 200;
    this.listeners = [];
    this.notify = debounce(10, false, this.notify);
  }

  getRequestIds() {
    return this.requestIds;
  }

  getRequests() {
    return this.requests;
  }

  getRequest(id: any) {
    return this.requests[id] || {};
  }

  readBlobAsText(blob: any, encoding = 'utf-8') {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      // eslint-disable-next-line no-undef
      const fr = new FileReader();
      fr.onload = () => {
        resolve(fr.result);
      };
      fr.onerror = (err: any) => {
        reject(err);
      };
      fr.readAsText(blob, encoding);
    });
  }

  formatResponse(response: any) {
    if (response) {
      if (typeof response === 'string') response = JSONTryParse(response);
      return JSON.stringify(response, null, 2);
    }
    return '{}';
  }

  updateRequest(id: any, data: any) {
    // update item
    const item = this.requests[id] || {};

    if (this.requestIds.length > this.maxLength) {
      const _id = this.requestIds[this.requestIds.length - 1];
      this.requestIds.splice(this.requestIds.length - 1, 1);
      this.requests[id] && delete this.requests[_id];
    }
    for (const key in data) {
      item[key] = data[key];
    }
    // update dom
    let domData = {
      id,
      index: item.index ?? this.requestIds.length + 1,
      host: item.host,
      url: item.url,
      status: item.status,
      method: item.method || '-',
      costTime: item.costTime > 0 ? `${item.costTime} ms` : '-',
      resHeaders: item.resHeaders || null,
      reqHeaders: item.reqHeaders || null,
      getData: item.getData || null,
      postData: item.postData || null,
      response: '',
      actived: !!item.actived,
      startTime: item.startTime,
      endTime: item.endTime,
    };
    switch (item.responseType) {
      case '':
      case 'text':
        // try to parse JSON
        if (typeof item.response === 'string') {
          try {
            domData.response = this.formatResponse(item.response);
          } catch (e) {
            // not a JSON string
            domData.response = item.response;
          }
        } else if (typeof item.response !== 'undefined') {
          domData.response = Object.prototype.toString.call(item.response);
        }
        break;
      case 'json':
        if (typeof item.response !== 'undefined') {
          domData.response = this.formatResponse(item.response);
        }
        break;
      case 'blob':
      case 'document':
      case 'arraybuffer':
      default:
        if (item.response && typeof item.response !== 'undefined') {
          this.readBlobAsText(item.response).then((res) => {
            domData.response = this.formatResponse(res);
          });
        }
        break;
    }
    if (item.readyState === 0 || item.readyState === 1) {
      domData.status = 'Pending';
    } else if (item.readyState === 2 || item.readyState === 3) {
      domData.status = 'Loading';
    } else if (item.readyState === 4) {
      // do nothing
    } else {
      domData.status = 'Unknown';
    }
    if (this.requestIds.indexOf(id) === -1) {
      this.requestIds.splice(0, 0, id);
    }
    this.requests[id] = domData;
    this.notify(this.requests[id]);
  }

  clearRequests() {
    this.requestIds = [];
    this.requests = {};
    this.notify();
  }

  notify(args?: any) {
    this.listeners.forEach((callback) => {
      callback(args);
    });
  }

  attach(callback: any) {
    this.listeners.push(callback);
  }
}

interface Props {}

interface State {
  showingId: null;
  requestIds: any[];
  requests: {};
  filterValue: string;
}

class Network extends Component<Props, State> {
  private name: 'Network';
  private mountState: boolean;
  // @ts-ignore
  private flatList: any;
  private textInput: any;
  private regInstance: RegExp;

  constructor(props: any) {
    super(props);
    this.name = 'Network';
    this.mountState = false;
    this.regInstance = new RegExp('');
    this.state = {
      showingId: null,
      requestIds: [],
      requests: {},
      filterValue: '',
    };
    ajaxStack.attach((currentRequest: any) => {
      console.log('ajaxStack currentRequest', currentRequest);
      if (this.mountState) {
        this.setState({
          requestIds: ajaxStack.getRequestIds(),
          requests: ajaxStack.getRequests(),
        });
      }
    });
  }

  componentDidMount() {
    this.mountState = true;
    // eslint-disable-next-line react/no-did-mount-set-state
    this.setState({
      requestIds: ajaxStack.getRequestIds(),
      requests: ajaxStack.getRequests(),
    });
    event.on('clear', this.clearRequests.bind(this));
  }

  componentWillUnmount() {
    this.mountState = false;
    event.off('clear', this.clearRequests.bind(this));
  }

  clearRequests = (name: SVGFESpecularLightingElement) => {
    if (name === this.name) {
      ajaxStack.clearRequests();
    }
  };

  ListHeaderComponent = () => {
    const count = Object.keys(this.state.requests || {}).length || 0;
    return (
      <View>
        <View style={styles.nwHeader}>
          <Text style={[styles.nwHeaderTitle, styles.flex3, styles.bold]}>
            ({count})Host
          </Text>
          <Text style={[styles.nwHeaderTitle, styles.flex1, styles.bold]}>
            Method
          </Text>
          <Text style={[styles.nwHeaderTitle, styles.flex1, styles.bold]}>
            Status
          </Text>
          <Text style={[styles.nwHeaderTitle, styles.bold, styles.vTime]}>
            Time/Retry
          </Text>
        </View>
        <View style={styles.filterValueBar}>
          <TextInput
            ref={(ref) => {
              this.textInput = ref;
            }}
            style={styles.filterValueBarInput}
            placeholderTextColor="#000000a1"
            placeholder="After entering the content, please submit to filter..."
            onSubmitEditing={({ nativeEvent }) => {
              if (nativeEvent) {
                this.regInstance = new RegExp(nativeEvent.text, 'ig');
                this.setState({ filterValue: nativeEvent.text });
              }
            }}
          />
          <TouchableOpacity
            style={styles.filterValueBarBtn}
            onPress={this.clearFilterValue}
          >
            <Text>X</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  clearFilterValue = () => {
    this.setState(
      {
        filterValue: '',
      },
      () => {
        this.textInput.clear();
      }
    );
  };

  copy2cURL(item: any) {
    let headerStr = '';
    if (item.reqHeaders) {
      Object.keys(item.reqHeaders).forEach((key) => {
        const reqHeaders = item.reqHeaders[key];
        if (reqHeaders) {
          headerStr += ` -H '${key}: ${reqHeaders}'`;
        }
      });
    }
    let cURL = `curl -X ${item.method} '${item.url}' ${headerStr}`;
    if (item.method === 'POST' && item.postData)
      cURL += ` --data-binary '${item.postData}'`;
    Clipboard.setString(cURL);
  }

  retryFetch(item: any) {
    const options = {
      method: item.method,
      headers: null,
      body: null,
    };
    if (item.reqHeaders) options.headers = item.reqHeaders;
    if (item.method === 'POST' && item.postData) options.body = item.postData;
    // @ts-ignore
    fetch(item.url, options);
  }
  // @ts-ignore
  renderItem = ({ item }) => {
    // @ts-ignore
    const _item = this.state.requests[item] || {};
    if (
      this.state.filterValue &&
      this.regInstance &&
      !this.regInstance.test(_item.url)
    )
      return null;
    return (
      <View style={styles.nwItem}>
        <TouchableOpacity
          onPress={() => {
            this.setState((state) => ({
              showingId: state.showingId === _item.id ? null : _item.id,
            }));
          }}
        >
          <View
            style={[
              styles.nwHeader,
              this.state.showingId === _item.id && styles.active,
              _item.status >= 400 && styles.error,
            ]}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="middle"
              style={[styles.nwHeaderTitle, styles.flex3]}
            >
              {`(${_item.index})${_item.host}`}
            </Text>
            <Text style={[styles.nwHeaderTitle, styles.flex1]}>
              {_item.method}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.nwHeaderTitle, styles.flex1]}
            >
              {_item.status}
            </Text>
            <TouchableOpacity
              onPress={() => {
                this.retryFetch(_item);
              }}
              style={[styles.nwHeaderTitle, styles.nwHBoxTouch]}
            >
              <Text>{_item.costTime}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        {this.state.showingId === _item.id && (
          <View style={styles.nwItemDetail}>
            <View>
              <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                Operate
              </Text>
              <TouchableOpacity
                onPress={() => {
                  this.copy2cURL(_item);
                }}
              >
                <Text>[ Copy cURL to clipboard ]</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Clipboard.setString(_item.response);
                }}
              >
                <Text>[ Copy response to clipboard ]</Text>
              </TouchableOpacity>
            </View>
            <View>
              <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                General
              </Text>
              <View style={styles.nwDetailItem}>
                <Text>URL:</Text>
                <Text>{_item.url}</Text>
              </View>
              <View style={styles.nwDetailItem}>
                <Text>startTime:</Text>
                <Text>{_item.startTime}</Text>
              </View>
              <View style={styles.nwDetailItem}>
                <Text>endTime:</Text>
                <Text>{_item.endTime}</Text>
              </View>
            </View>
            {_item.reqHeaders && (
              <View>
                <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                  Request Header
                </Text>
                {Object.keys(_item.reqHeaders).map((key) => (
                  <View style={styles.nwDetailItem} key={key}>
                    <Text>{key}:</Text>
                    <Text>{_item.reqHeaders[key]}</Text>
                  </View>
                ))}
              </View>
            )}
            {_item.resHeaders && (
              <View>
                <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                  Response Header
                </Text>
                {Object.keys(_item.resHeaders).map((key) => (
                  <View style={styles.nwDetailItem} key={key}>
                    <Text>{key}:</Text>
                    <Text>{_item.resHeaders[key]}</Text>
                  </View>
                ))}
              </View>
            )}
            {_item.getData && (
              <View>
                <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                  Query String Parameters
                </Text>
                {Object.keys(_item.getData).map((key) => (
                  <View style={styles.nwDetailItem} key={key}>
                    <Text>{key}:</Text>
                    <Text>{_item.getData[key]}</Text>
                  </View>
                ))}
              </View>
            )}
            {_item.postData && (
              <View>
                <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                  Form Data
                </Text>
                <JsonTree
                  theme={theme}
                  data={JSONTryParse(_item.postData)}
                  hideRoot
                />
              </View>
            )}
            <View>
              <Text style={[styles.nwItemDetailHeader, styles.bold]}>
                Response
              </Text>
              <View style={styles.nwDetailItem}>
                <JsonTree
                  theme={theme}
                  data={JSONTryParse(_item.response)}
                  hideRoot
                />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  render() {
    return (
      <FlatList
        ref={(ref) => {
          this.flatList = ref;
        }}
        showsVerticalScrollIndicator
        ListHeaderComponent={this.ListHeaderComponent}
        extraData={this.state}
        data={this.state.requestIds}
        stickyHeaderIndices={[0]}
        renderItem={this.renderItem}
        ListEmptyComponent={() => <Text> Loading...</Text>}
        keyExtractor={(item) => item}
      />
    );
  }
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: '#fffacd',
  },
  bold: {
    fontWeight: '700',
  },
  vTime: {
    width: 90,
  },
  error: {
    backgroundColor: '#ffe4e1',
    borderColor: '#ffb930',
  },
  filterValueBar: {
    borderColor: '#eee',
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
  },
  filterValueBarBtn: {
    alignItems: 'center',
    backgroundColor: '#eee',
    justifyContent: 'center',
    width: 40,
  },
  filterValueBarInput: {
    backgroundColor: '#ffffff',
    color: '#000000',
    flex: 1,
    paddingLeft: 10,
  },
  flex1: {
    flex: 1,
  },
  flex3: {
    flex: 3,
  },
  nwDetailItem: {
    flexDirection: 'row',
    paddingLeft: 5,
  },
  nwHeader: {
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  nwHeaderTitle: {
    borderColor: '#eee',
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  nwHBoxTouch: {
    width: 90,
    borderRadius: 20,
    borderColor: '#eeeeee',
    borderWidth: 1,
  },
  nwItem: {},
  nwItemDetail: {
    borderColor: '#eee',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  nwItemDetailHeader: {
    backgroundColor: '#eee',
    paddingLeft: 5,
    paddingVertical: 4,
  },
});

function unixId() {
  return Math.round(Math.random() * 1000000).toString(16);
}

function proxyAjax(XHR: any, stack: any) {
  if (!XHR) {
    return;
  }
  const _open = XHR.prototype.open;
  const _send = XHR.prototype.send;
  // @ts-ignore
  this._open = _open;
  // @ts-ignore
  this._send = _send;

  // mock open()
  XHR.prototype.open = function (...args: any) {
    // eslint-disable-next-line consistent-this
    const XMLReq = this;
    const method = args[0];
    const url = args[1];
    const id = unixId();
    let timer: any = null;

    // may be used by other functions
    XMLReq._requestID = id;
    XMLReq._method = method;
    XMLReq._url = url;

    // mock onreadystatechange
    const _onreadystatechange = XMLReq.onreadystatechange || function () {};
    const onreadystatechange = function () {
      const item = stack.getRequest(id);

      // update status
      item.readyState = XMLReq.readyState;
      item.status = 0;
      if (XMLReq.readyState > 1) {
        item.status = XMLReq.status;
      }
      item.responseType = XMLReq.responseType;

      if (XMLReq.readyState === 0) {
        // UNSENT
        if (!item.startTime) {
          item.startTime = +new Date();
        }
      } else if (XMLReq.readyState === 1) {
        // OPENED
        if (!item.startTime) {
          item.startTime = +new Date();
        }
      } else if (XMLReq.readyState === 2) {
        // HEADERS_RECEIVED
        item.resHeaders = {};
        const resHeaders = XMLReq.getAllResponseHeaders() || '';
        const resHeadersArr = resHeaders.split('\n');
        // extract plain text to key-value format
        for (let i = 0; i < resHeadersArr.length; i++) {
          const line = resHeadersArr[i];
          if (!line) {
            continue;
          }
          const arr = line.split(': ');
          const key = arr[0];
          const value = arr.slice(1).join(': ');
          item.resHeaders[key] = value;
        }
      } else if (XMLReq.readyState === 3) {
        // LOADING
      } else if (XMLReq.readyState === 4) {
        // DONE
        clearInterval(timer);
        item.endTime = +new Date();
        item.costTime = item.endTime - (item.startTime || item.endTime);
        item.response = XMLReq.response;
      } else {
        clearInterval(timer);
      }

      if (!XMLReq._noVConsole) {
        stack.updateRequest(id, item);
      }
      return _onreadystatechange.apply(XMLReq, args);
    };
    XMLReq.onreadystatechange = onreadystatechange;

    // some 3rd libraries will change XHR's default function
    // so we use a timer to avoid lost tracking of readyState
    let preState = -1;
    timer = setInterval(() => {
      if (preState !== XMLReq.readyState) {
        preState = XMLReq.readyState;
        onreadystatechange.call(XMLReq);
      }
    }, 10);

    return _open.apply(XMLReq, args);
  };

  // mock send()
  XHR.prototype.send = function (...args: any) {
    // eslint-disable-next-line consistent-this
    const XMLReq = this;
    const data = args[0];

    const item = stack.getRequest(XMLReq._requestID);
    item.method = XMLReq._method.toUpperCase();

    let query = XMLReq._url.split('?'); // a.php?b=c&d=?e => ['a.php', 'b=c&d=', '?e']
    item.url = XMLReq._url;
    item.host = query[0];

    if (query.length === 2) {
      item.getData = {};
      query = query[1].split('&'); // => ['b=c', 'd=?e']
      for (let q of query) {
        q = q.split('=');
        item.getData[q[0]] = decodeURIComponent(q[1]);
      }
    }

    item.reqHeaders = XMLReq._headers;

    if (item.method === 'POST' && data) {
      // save POST data
      if (typeof data === 'string') {
        item.postData = data;
      } else {
        try {
          item.postData = JSON.stringify(data);
        } catch (error) {}
      }
    }

    if (!XMLReq._noVConsole) {
      stack.updateRequest(XMLReq._requestID, item);
    }

    return _send.apply(XMLReq, args);
  };
}

module.exports = (function () {
  if (!ajaxStack) {
    ajaxStack = new AjaxStack();
  }
  // @ts-ignore
  proxyAjax(global.originalXMLHttpRequest || global.XMLHttpRequest, ajaxStack);
  return <Network />;
})();
