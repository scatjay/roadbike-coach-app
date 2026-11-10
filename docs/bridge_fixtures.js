/* 由 tools/build.py 從 design_v2/fixtures/status_*.json 產生，不要手改。示意資料：沒有任何座標、位置或金鑰。
 * 契約來源：公路車專案 phone-agent/hub_fixtures（schema:1）。 */
(function (root, data) {
  if (typeof module === 'object' && module.exports) module.exports = data; else root.BRIDGE_FIXTURES = data;
})(typeof self !== 'undefined' ? self : this, {
 "band_unconfirmed": {
  "schema": 1,
  "t": 1783000000.5,
  "riding": false,
  "bridge": {
   "ok": true,
   "proxy_ms": 12,
   "health": {
    "ok": true,
    "t": 1783000000.123,
    "coach": {
     "silent_s": 12
    },
    "sensors": {
     "hr_age": 0.9,
     "cad_age": null,
     "pw_age": null,
     "conn_age": 0.4,
     "scanning": false
    },
    "headunit": {
     "tx": "送第 3/3 段",
     "tx_age": 41.0,
     "dev_n": 128,
     "dev_age": 3.2
    },
    "location": {
     "state": "ok",
     "fgs_type": true,
     "n": 55,
     "age": 2.1
    },
    "band": {
     "tx": 2,
     "tx_age": 280.0
    }
   }
  },
  "coach": {
   "pid_alive": true,
   "riding": false,
   "state_age": null,
   "last_decision_age": 41.0,
   "decisions_tail": [
    {
     "age": 41.0,
     "type": "fire",
     "text": "賽段 國姓橋"
    },
    {
     "age": 160.0,
     "type": "fire",
     "text": "順風 心率141 守住"
    }
   ]
  },
  "version": {
   "deploy_log_head_age": 7200.0,
   "agent_mtime_age": 7500.0,
   "agent_start_age": 3000.0,
   "consistent": true
  },
  "device": {
   "battery": {
    "pct": 78,
    "charging": true,
    "age": 12.0
   },
   "temp": {
    "c": 34.8,
    "age": 12.0
   }
  }
 },
 "bridge_down": {
  "schema": 1,
  "t": 1783000000.5,
  "riding": false,
  "bridge": {
   "ok": false,
   "proxy_ms": 3,
   "error": "connect_refused"
  },
  "coach": {
   "pid_alive": true,
   "riding": false,
   "state_age": null,
   "last_decision_age": null,
   "decisions_tail": []
  },
  "version": {
   "deploy_log_head_age": null,
   "agent_mtime_age": null,
   "agent_start_age": null,
   "consistent": null
  },
  "device": {
   "battery": {
    "pct": null,
    "charging": null,
    "age": null
   },
   "temp": {
    "c": null,
    "age": null
   }
  }
 },
 "coach_silent": {
  "schema": 1,
  "t": 1783000000.5,
  "riding": false,
  "bridge": {
   "ok": true,
   "proxy_ms": 12,
   "health": {
    "ok": true,
    "t": 1783000000.123,
    "coach": {
     "silent_s": 400
    },
    "sensors": {
     "hr_age": 0.9,
     "cad_age": null,
     "pw_age": null,
     "conn_age": 0.4,
     "scanning": false
    },
    "headunit": {
     "tx": "送第 3/3 段",
     "tx_age": 41.0,
     "dev_n": 128,
     "dev_age": 3.2
    },
    "location": {
     "state": "ok",
     "fgs_type": true,
     "n": 55,
     "age": 2.1
    },
    "band": {
     "tx": 1,
     "tx_age": 95.0
    }
   }
  },
  "coach": {
   "pid_alive": false,
   "riding": false,
   "state_age": null,
   "last_decision_age": null,
   "decisions_tail": []
  },
  "version": {
   "deploy_log_head_age": 7200.0,
   "agent_mtime_age": 7500.0,
   "agent_start_age": 3000.0,
   "consistent": true
  },
  "device": {
   "battery": {
    "pct": 78,
    "charging": true,
    "age": 12.0
   },
   "temp": {
    "c": 34.8,
    "age": 12.0
   }
  }
 },
 "ok": {
  "schema": 1,
  "t": 1783000000.5,
  "riding": false,
  "bridge": {
   "ok": true,
   "proxy_ms": 12,
   "health": {
    "ok": true,
    "t": 1783000000.123,
    "coach": {
     "silent_s": 12
    },
    "sensors": {
     "hr_age": 0.9,
     "cad_age": null,
     "pw_age": null,
     "conn_age": 0.4,
     "scanning": false
    },
    "headunit": {
     "tx": "送第 3/3 段",
     "tx_age": 41.0,
     "dev_n": 128,
     "dev_age": 3.2
    },
    "location": {
     "state": "ok",
     "fgs_type": true,
     "n": 55,
     "age": 2.1
    },
    "band": {
     "tx": 1,
     "tx_age": 95.0
    }
   }
  },
  "coach": {
   "pid_alive": true,
   "riding": false,
   "state_age": null,
   "last_decision_age": 41.0,
   "decisions_tail": [
    {
     "age": 41.0,
     "type": "fire",
     "text": "賽段 國姓橋"
    },
    {
     "age": 160.0,
     "type": "fire",
     "text": "順風 心率141 守住"
    }
   ]
  },
  "version": {
   "deploy_log_head_age": 7200.0,
   "agent_mtime_age": 7500.0,
   "agent_start_age": 3000.0,
   "consistent": true
  },
  "device": {
   "battery": {
    "pct": 78,
    "charging": true,
    "age": 12.0
   },
   "temp": {
    "c": 34.8,
    "age": 12.0
   }
  }
 },
 "riding": {
  "schema": 1,
  "t": 1783000000.5,
  "riding": true,
  "bridge": {
   "ok": true,
   "proxy_ms": 12,
   "health": {
    "ok": true,
    "t": 1783000000.123,
    "coach": {
     "silent_s": 12
    },
    "sensors": {
     "hr_age": 0.9,
     "cad_age": null,
     "pw_age": null,
     "conn_age": 0.4,
     "scanning": false
    },
    "headunit": {
     "tx": "送第 3/3 段",
     "tx_age": 41.0,
     "dev_n": 128,
     "dev_age": 3.2
    },
    "location": {
     "state": "ok",
     "fgs_type": true,
     "n": 55,
     "age": 2.1
    },
    "band": {
     "tx": 1,
     "tx_age": 95.0
    }
   }
  },
  "coach": {
   "pid_alive": true,
   "riding": true,
   "state_age": 20.0,
   "last_decision_age": 41.0,
   "decisions_tail": []
  },
  "version": {
   "deploy_log_head_age": 7200.0,
   "agent_mtime_age": 7500.0,
   "agent_start_age": 3000.0,
   "consistent": true
  },
  "device": {
   "battery": {
    "pct": 78,
    "charging": true,
    "age": 12.0
   },
   "temp": {
    "c": 34.8,
    "age": 12.0
   }
  }
 }
});
