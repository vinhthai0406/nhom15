# Ghi chú triển khai cluster

## Thông tin các node

| Vai trò | Hostname | Tài khoản SSH |
| --- | --- | --- |
| Server 1 | `nhom15s1` | `server01` |
| Server 2 | `nhom15s2` | `server02` |
| Server 3 | `nhom15s3` | `server03` |
| Client 1 | `nhom15a1` | `agent01` |
| Client 2 | `nhom15a2` | `agent02` |


## Các bước thực hiện

### 1. Chuẩn bị Ansible

Cài đặt `k3s-ansible` trên một máy Ubuntu.

### 2. Cài đặt K3s

Viết hoặc cấu hình playbook để tự động cài đặt K3s server và agent trên các node tương ứng. Sau khi hoàn tất, 5 node sẽ tham gia cùng một cluster.

### 3. Triển khai Load Balancer và HA

- Cài đặt Keepalived và HAProxy trên 3 server.
- Cấu hình Keepalived để một server giữ địa chỉ IP ảo (VIP); khi server đó gặp sự cố, VIP được chuyển sang server khác.
- Dùng HAProxy để phân phối request đến các server.

### 4. Triển khai monitoring

Cài đặt Prometheus và Grafana trên các server. Cấu hình để các server đồng bộ dữ liệu monitoring với nhau.

### 5. Triển khai phần mềm

Triển khai ứng dụng lên cluster.

## Thiết lập SSH key

Tạo SSH key trên máy điều khiển:

```bash
ssh-keygen -t ed25519
```

Cài public key lên từng node:

```bash
ssh-copy-id server01@<ip1> 
ssh-copy-id server02@<ip2>
ssh-copy-id server03@<ip3>
ssh-copy-id agent01@<ip4>
ssh-copy-id agent02@<ip5>
```
