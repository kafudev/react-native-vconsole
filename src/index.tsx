import React, { PureComponent } from 'react';
import {
  Animated,
  Dimensions,
  InteractionManager,
  NativeModules,
  PanResponder,
  PanResponderInstance,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import event from './modules/event';
import Info from './modules/info';
import * as Network from './modules/network';

type ValueXY = Animated.ValueXY;
type Value = Animated.Value;

const { width, height } = Dimensions.get('window');

interface PropsType {
  appInfo?: {};
  console?: boolean;
  panels?: {
    title: string;
    component: React.ReactNode;
  };
  showBtn?: boolean;
}

interface StateType {
  panels: {
    title: string;
    component: React.ReactNode;
  }[];
  showPanel: boolean;
  showFps: boolean;
  currentPanelTab: number;
  pan: ValueXY;
  scale: Value;
}

class RNVConsole extends PureComponent<PropsType, StateType> {
  static defaultProps = {
    appInfo: {},
    console: true,
    showBtn: true,
  };

  private panResponder: PanResponderInstance;

  constructor(props: any) {
    super(props);

    this.state = {
      panels: [
        {
          title: 'Network',
          component: Network,
        },
        {
          title: 'Info',
          component: Info,
        },
      ],
      showPanel: false,
      showFps: false,
      currentPanelTab: 0,
      pan: new Animated.ValueXY(),
      scale: new Animated.Value(1),
    };

    if (props.console) {
      this.state.panels.unshift({
        title: 'Log',
        component: require('./modules/console'),
      });
    }

    if (this.props.panels) {
      this.state.panels.push(this.props.panels);
    }
    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        this.state.pan.setOffset({
          // @ts-ignore
          x: this.state.pan.x._value,
          // @ts-ignore
          y: this.state.pan.y._value,
        });
        this.state.pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: this.state.pan.x, dy: this.state.pan.y }],
        {
          useNativeDriver: false,
        }
      ),
      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onPanResponderRelease: ({ nativeEvent }, gestureState) => {
        // console.log('onPanResponderRelease nativeEvent', nativeEvent);
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5)
          this.togglePanel();
        InteractionManager.runAfterInteractions(() => {
          Animated.spring(this.state.scale, {
            useNativeDriver: true,
            toValue: 1,
            friction: 7,
          });
          this.state.pan.flattenOffset();
        });
      },
    });
  }

  togglePanel = () => {
    this.setState((state) => ({
      showPanel: !state.showPanel,
    }));
  };

  clearLogs = () => {
    const index = this.state.currentPanelTab;
    // @ts-ignore
    event.trigger('clear', this.state.panels[index].title);
  };

  showDevPanel = () => {
    this.togglePanel();
    if (NativeModules.DevMenu && NativeModules.DevMenu.show) {
      NativeModules.DevMenu.show();
    } else if (NativeModules.Common && NativeModules.Common.showDevMenu) {
      NativeModules.Common.showDevMenu();
    }
  };

  reloadJs = () => {
    this.togglePanel();
    if (NativeModules.DevSettings && NativeModules.DevSettings.reload) {
      NativeModules.DevSettings.reload();
    } else if (NativeModules.Common && NativeModules.Common.reloadJs) {
      NativeModules.Common.reloadJs();
    }
  };

  showFpsPanel = () => {
    let isShow = this.state.showFps;
    this.setState({
      showFps: !isShow,
    },()=>{
      if (NativeModules.Common && NativeModules.Common.showFps) {
        NativeModules.Common.showFps(isShow);
      }
    });
  };

  renderPanelHeader() {
    return (
      <View style={styles.panelHeader}>
        {this.state.panels.map((item, index) => (
          <TouchableOpacity
            key={item.title + index.toString()}
            onPress={() => {
              this.setState({
                currentPanelTab: index,
              });
            }}
            style={[
              styles.panelHeaderItem,
              index === this.state.currentPanelTab && styles.activeTab,
            ]}
          >
            <Text style={styles.panelHeaderItemText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  renderPanelFooter() {
    return (
      <View style={styles.panelBottom}>
        <TouchableOpacity
          onPress={this.clearLogs}
          style={styles.panelBottomBtn}
        >
          <Text style={styles.panelBottomBtnText}>Clear</Text>
        </TouchableOpacity>
        {__DEV__ ? (
          <TouchableOpacity
            onPress={this.showDevPanel}
            style={styles.panelBottomBtn}
          >
            <Text style={styles.panelBottomBtnText}>Dev</Text>
          </TouchableOpacity>
        ) : null}
        {__DEV__ ? (
          <TouchableOpacity
            onPress={this.reloadJs}
            style={styles.panelBottomBtn}
          >
            <Text style={styles.panelBottomBtnText}>Reload</Text>
          </TouchableOpacity>
        ) : null}
          <TouchableOpacity
            onPress={this.showFpsPanel}
            style={styles.panelBottomBtn}
          >
            <Text style={styles.panelBottomBtnText}>Fps</Text>
          </TouchableOpacity>
        <TouchableOpacity
          onPress={this.togglePanel}
          style={styles.panelBottomBtn}
        >
          <Text style={styles.panelBottomBtnText}>Hide</Text>
        </TouchableOpacity>
      </View>
    );
  }

  renderPanel() {
    const Instance = this.state.panels[this.state.currentPanelTab || 0];
    let Component = Instance.component;
    if (Instance.title === 'Info') {
      // @ts-ignore
      Component = <Component info={this.props.appInfo} />;
    }

    return (
      <View style={styles.panel}>
        {this.renderPanelHeader()}
        <View style={styles.panelContent}>{Component}</View>
        {this.renderPanelFooter()}
      </View>
    );
  }

  renderHomeBtn() {
    const { pan, scale } = this.state;
    const [translateX, translateY] = [pan.x, pan.y];
    const btnStyle = { transform: [{ translateX }, { translateY }, { scale }] };

    return (
      <Animated.View
        {...this.panResponder.panHandlers}
        style={[styles.homeBtn, btnStyle]}
      >
        <Text style={styles.homeBtnText}>VConsole</Text>
      </Animated.View>
    );
  }

  render() {
    return this.state.showPanel
      ? this.renderPanel()
      : this.props.showBtn
      ? this.renderHomeBtn()
      : null;
  }
}

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: '#fff',
  },
  homeBtn: {
    alignItems: 'center',
    backgroundColor: '#04be02',
    borderRadius: 4,
    bottom: 140,
    elevation: 0.4,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    shadowColor: 'rgb(18,34,74)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    width: 80,
    zIndex: 999999999,
  },
  homeBtnText: {
    color: '#fff',
  },
  panel: {
    backgroundColor: '#fff',
    bottom: 0,
    elevation: 999999999,
    flexDirection: 'column',
    height: (height / 3) * 2,
    position: 'absolute',
    right: 0,
    width,
    zIndex: 999999999,
  },
  panelBottom: {
    alignItems: 'center',
    backgroundColor: '#eee',
    borderColor: '#d9d9d9',
    borderWidth: StyleSheet.hairlineWidth,
    flex: 0.1,
    flexDirection: 'row',
    width,
  },
  panelBottomBtn: {
    borderColor: '#d9d9d9',
    borderRightWidth: StyleSheet.hairlineWidth,
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  panelBottomBtnText: {
    color: '#000',
    fontSize: 14,
    textAlign: 'center',
  },
  panelContent: {
    flex: 0.9,
    width,
  },
  panelHeader: {
    backgroundColor: '#eee',
    borderColor: '#d9d9d9',
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    width,
  },
  panelHeaderItem: {
    borderColor: '#d9d9d9',
    borderRightWidth: StyleSheet.hairlineWidth,
    color: '#000',
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  panelHeaderItemText: {
    textAlign: 'center',
  },
});

export default RNVConsole;
