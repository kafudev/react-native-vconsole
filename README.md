# react-native-vconsole

vConsole for react native

## Features

1. console[log, warn, error, info] in Log Panel.
2. Network request list & detail.
3. Customized Version Info you want to show.

## Installation

```sh
$ yarn add @kafudev/react-native-vconsole
// or
npm i @kafudev/react-native-vconsole
```

## Usage


可接受参数
```
interface PropsType {
  appInfo?: {}
  console?: boolean
  panels?: {
    title: string
    component: React.ReactNode
  }
}
```

```javascript
import VConsole from '@kafudev/react-native-vconsole'
/* INFO is optional */

// in render function
render() {
  return (
    <View>
        <VConsole
            // 使用 'react-native-config-reader' 库获获取额外信息
            appInfo={{
                原生构建类型: ConfigReader.BUILD_TYPE,
                原生版本号: ConfigReader.VERSION_NAME || ConfigReader.CFBundleShortVersionString,
                原生构建时间: ConfigReader.BUILD_TIME,
                热更新版本号: codePushStore.info.label,
                热更新详情: codePushStore.info.desc,
            }}
            // 另外的的面板
            panels={panels}
            // console.time 可辨别是否开启 debug 网页
            console={__DEV__ ? !console.time : true}
        />
    </View>
  )
}
```


# 鸣谢

vConsole for react native

本插件集合了多种vconsole的优点，感谢以下库:

https://github.com/itenl/react-native-vdebug
https://github.com/Grewer/react-native-vconsole
https://github.com/fwon/RNVConsole
https://github.com/sigmayun/react-native-vconsole


## License

MIT
